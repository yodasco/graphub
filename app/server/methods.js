let config = Meteor.settings.neo4j;
let GitHubApi = Meteor.npmRequire('github');

let getNeo4j = function(config) {
  let seraph = Meteor.npmRequire('seraph');
  let db = seraph(config);
  return Async.wrap(db, ['save', 'find', 'query', 'delete', 'relate']);
};

let db = getNeo4j(config);

Meteor.methods({
  getShortestPath(user1, user2) {
    check(user1, String);
    check(user2, String);
    let query = `MATCH (u1:User {login: '${user1}'}),
                       (u2:User {login: '${user2}'}),
                       p = shortestPath((u1)-[:CONTRIBUTOR|MEMBER*]-(u2))
                 RETURN p`;
    return runNeo4jQuery(query);
  },
  getAllShortestPaths(user1, user2) {
    check(user1, String);
    check(user2, String);
    let query = `MATCH (u1:User {login: '${user1}'}),
                       (u2:User {login: '${user2}'}),
                       p = allShortestPaths((u1)-[:CONTRIBUTOR|MEMBER*]-(u2))
                 RETURN p limit 5`;
    return runNeo4jQuery(query);
  },
  // getCoopsForUser(login, limit) {
  //   check(login, String);
  //   check(limit, Match.Integer);
  //   let query = `match (me:User {login: '${login}'})-[rel1:MEMBER|CONTRIBUTOR]->
  //       (repo:Repository)<-[rel2:MEMBER|CONTRIBUTOR]-(u:User)
  //       where id(u) <> id(me)
  //       return * limit ${limit}`;
  //   return runNeo4jQuery(query);
  // },

  discoverUser(user, what, limit) {
    console.log({discoverUser: user});
    check(user, String);
    checkWhat(what);
    check(limit, Match.Integer);
    limit = Math.min(limit, 100);
    let query = `MATCH (u:User {login: '${user}'})-[rel:${what}]->(r:Repository)
                 return * limit ${limit}`;
    return runNeo4jQuery(query);
  },
  discoverRepo(repoName, what, limit, excludedUser) {
    console.log({discoverRepo: repoName});
    check(repoName, String);
    checkWhat(what);
    check(limit, Match.Integer);
    check(excludedUser, Match.Optional(String));
    limit = Math.min(limit, 100);
    let excludePhrase = excludedUser ? `where n.login <> '${excludedUser}'` : '';
    let query = `MATCH (r:Repository {full_name: '${repoName}'})-[rel:${what}]-(n)
                ${excludePhrase}
                 return * limit ${limit}`;
    return runNeo4jQuery(query);
  },
  enrichUser(nodeId, login) {
    console.log({enrichUser: login});
    check(nodeId, String);
    check(login, String);
    check(this.userId, String);
    this.unblock();
    let gh = getGithubApi(this.userId);
    let user;
    try {
      user = gh.user.getFrom({user: login});
    } catch (e) {
      if (e.code === 404) {
        // User was deleted or for some other reason - not found. Delete it
        deleteNodeAndRelations(nodeId);
        return;
      }
      throw new Meteor.Error(JSON.stringify(e));
    }
    if (user) {
      let reducedUser = pluckAttributes(user, USER_ATTRIBUTES);
      reducedUser.ghId = user.id;
      reducedUser.id = nodeId;
      reducedUser.login = login;
      reducedUser.lastLoadedFromGithub = Date.now();
      later(function() {
        updateNode(reducedUser);
        addUserRepos(reducedUser, gh);
      });
      return reducedUser;
    }
  },
  enrichRepo(nodeId, repoFullName) {
    console.log({enrichRepo: repoFullName});
    check(nodeId, String);
    check(repoFullName, String);
    check(this.userId, String);
    this.unblock();
    let gh = getGithubApi(this.userId);
    let [user, repo] = repoFullName.split('/');
    let repoData;
    try {
      repoData = gh.repos.get({user, repo});
    } catch(e) {
      if (e.code === 404) {
        // Repo was deleted or for some other reason - not found. Delete it
        deleteNodeAndRelations(nodeId);
        return;
      }
      throw new Meteor.Error(JSON.stringify(e));
    }
    if (repoData.message === 'Moved Permanently') {
      // If a repo was moved - delete it. It surely had already been added at
      // its new destination (don't try to merge or do anything smart...)
      deleteNodeAndRelations(nodeId);
      return;
    }
    let reducedRepo = pluckAttributes(repoData, REPO_ATTRIBUTES);
    reducedRepo.ghId = repoData.id;
    reducedRepo.id = nodeId;
    reducedRepo['full_name'] = repoFullName;
    reducedRepo.lastLoadedFromGithub = Date.now();
    later(function() {
      updateNode(reducedRepo);
    });
    if (!reducedRepo.fork) {
      // When repo is a fork - we can't tell for sure wheather the contribution
      // was to this fork or the forkee.
      // therefore - we do not relate contributors to the forked repo. Most
      // chances these "contributors" aren't even aware of this forked repo.
      let contributors = gh.repos.getContributors({user, repo});
      if (contributors && _.isArray(contributors)) {
        let metaLink = contributors.meta.link; // The link to the next page, if any
        contributors = getContributorsDataFromGhResult(contributors);
        reducedRepo.contributors = contributors;
        later(function() {
          updateAndAddContributors(nodeId, contributors);
          loadMorePagedContributors(metaLink, nodeId, gh);
        });
      }
    }
    return reducedRepo;
  },
});

let later = function(func) {
  return Meteor.setTimeout(func, 0);
};

let getContributorsDataFromGhResult = function(ghContributors) {
  let atts = USER_ATTRIBUTES.concat(['contributions', 'login']);
  let contributors = ghContributors.map(function(contributor) {
    let ret = pluckAttributes(contributor, atts);
    ret.ghId = contributor.id;
    return ret;
  });
  return contributors;
};

let loadMorePagedContributors = function(metaLink, repoNodeId, gh) {
  while (gh.hasNextPage(metaLink)) {
    let ghContributors = gh.getNextPage(metaLink);
    let contributors = getContributorsDataFromGhResult(ghContributors);
    metaLink = ghContributors.meta.link; // The link to the next page, if any
    updateAndAddContributors(repoNodeId, contributors);
  }
};

let addUserRepos = function(user, gh) {
  let userNodeId = user.id;
  let userRepos = gh.repos.getFromUser({
    user: user.login,
    sort: 'pushed',
    type: 'all'
  });
  if (userRepos) {
    let metaLink = userRepos.meta.link;
    addUserReposFromArray(userRepos, userNodeId);
    while (gh.hasNextPage(metaLink)) {
      let userRepos = gh.getNextPage(metaLink);
      metaLink = userRepos.meta.link;
      addUserReposFromArray(userRepos, userNodeId);
    }
  }
};


let addUserReposFromArray = function(userRepos, userNodeId) {
  userRepos.forEach(function(repo) {
    let reducedRepo = pluckAttributes(repo, REPO_ATTRIBUTES);
    reducedRepo.ghId = repo.id;
    delete reducedRepo.id;
    reducedRepo['full_name'] = repo['full_name'];
    let repoNode = addOrUpdateRepo(reducedRepo);
    if (repoNode) {
      let rel = addOrUpdateMembership(userNodeId,
                                     {},
                                      repoNode.id);
    }
  });
};


let updateAndAddContributors = function(repoId, contributors) {
  check(repoId, Match.OneOf(String, Match.Integer));
  check(contributors, [Object]);
  contributors.forEach(function(contributor) {
    let contributions = contributor.contributions;
    delete contributor.contributions;
    let contributorNode = addOrUpdateContributor(contributor);
    if (contributorNode) {
      let rel = addOrUpdateContribution(contributorNode.id,
                                        {contributions},
                                        repoId);
    }
  });
};

let deleteNodeAndRelations = function(id) {
  check(id, Match.OneOf(String, Match.Integer));
  let force = true; // Delete relationships as well
  try {
    return db.delete(id, force);
  } catch(e) {
    if (e.code === 'Neo.ClientError.Statement.EntityNotFound') {
      // node already delete
    } else {
      console.error(e);
      throw e;
    }
  }
};

let updateNode = function(nodeData) {
  check(nodeData, Object);
  check(nodeData.id, Match.OneOf(Match.Integer, String));
  nodeData = _.clone(nodeData);
  let nodeId = nodeData.id;
  delete nodeData.id;
  removeNulls(nodeData);
  let setStatement = _.map(nodeData, function(v, k) {
    if (_.isNumber(v) || _.isBoolean(v)) {
      return `n.${k} = ${v}`;
    } else {
      v = v.replace(/'/g, '\\\'');
      return `n.${k} = '${v}'`;
    }
  }).join(', ');
  let query = `match (n) where id(n) = ${nodeId} set ${setStatement} return n`;
  let ret = db.query(query);
  return ret && ret.length > 0 && ret[0];
};

const USER_ATTRIBUTES = ['created_at', 'avatar_url', 'bio', 'blog', 'company', 'email',
  'followers', 'following', 'hireable', 'html_url', 'location', 'name',
  'public_gists', 'public_repos', 'type'];
const REPO_ATTRIBUTES = ['created_at', 'default_branch', 'description', 'fork',
  'forks_count', 'homepage', 'html_url', 'language', 'name', 'network_count',
  'pushed_at', 'size', 'stargazers_count', 'subscribers_count'];

let pluckAttributes = function(obj, attributeNames) {
  let res = {};
  attributeNames.forEach(function(att) {
    if (obj[att]) {
      res[att] = obj[att];
    }
  });
  return res;
};

let getGithubApi = function(userId) {
  check(userId, String);
  let user = Meteor.users.findOne({_id: userId},
                                  {fields: {'services.github': 1}});
  check(user, Object);
  let github = new GitHubApi({
    version: '3.0.0',
    debug: false,
  });
  github.authenticate({
    type: 'oauth',
    token: user.services.github.accessToken
  });

  return {
    user: Async.wrap(github.user, ['getFrom']),
    repos: Async.wrap(github.repos, ['get', 'getContributors', 'getFromUser']),
    getNextPage: Async.wrap(github, 'getNextPage'),
    hasNextPage: github.hasNextPage,
  };
};

let addOrUpdateContribution = function(userId, properties, repoId) {
  let lastLoadedFromGithub = Date.now();
  let query = `match (u:User), (r:Repository)
    where id(u) = ${userId}
      and id(r) = ${repoId}
    merge (u)-[rel:CONTRIBUTOR]->(r)
    set rel.lastLoadedFromGithub = ${lastLoadedFromGithub},
      rel.contributions = ${properties.contributions}
    return rel`;
  let ret = db.query(query);
  return ret && ret.length && ret[0];
};

let addOrUpdateMembership = function(userId, properties, repoId) {
  let lastLoadedFromGithub = Date.now();
  let query = `match (u:User), (r:Repository)
    where id(u) = ${userId}
      and id(r) = ${repoId}
    merge (u)-[rel:MEMBER]->(r)
    set rel.lastLoadedFromGithub = ${lastLoadedFromGithub}
    return rel`;
  let ret = db.query(query);
  return ret && ret.length && ret[0];
};

let addOrUpdateContributor = function(contributorData) {
  contributorData.lastLoadedFromGithub = Date.now();
  let data = db.find({login: contributorData.login}, 'User');
  if (data && data.length) {
    // Node found - update it by id
    contributorData.id = data[0].id;
    return updateNode(contributorData);
  } else {
    // Node not found - create it (saving without an ID creates a node)
    saveIgnoreConstraintViolationException(contributorData, 'User');
  }
};

let saveIgnoreConstraintViolationException = function(data, label) {
  try {
    return db.save(data, label);
  } catch(e) {
    if (e.message) {
      e.message = JSON.parse(e.message);
      if (e.message && e.message.cause &&
          e.message.cause.exception === 'ConstraintViolationException') {
        // guard agains two or more concurrent insertions of the same node
        // OK
      } else {
        throw e;
      }
    }
  }
};

let addOrUpdateRepo = function(repoData) {
  let data = db.find({'full_name': repoData['full_name']}, 'Repository');
  if (data && data.length) {
    // Node found - update it by id
    repoData.id = data[0].id;
    return updateNode(repoData);
  } else {
    // Node not found - create it (saving without an ID creates a node)
    saveIgnoreConstraintViolationException(repoData, 'Repository');
  }
};

let removeNulls = function(o) {
  _.each(o, function(v, k) {
    if(_.isUndefined(v) || v === null) {
      delete o[k];
    }
  });
  return o;
};

let checkWhat = function(what) {
  check(what, String);
  const relationsTypes = ['MEMBER', 'CONTRIBUTOR', 'FORKED', 'STAR'];
  let whatToLoad = what.split('|');
  whatToLoad.forEach(function(w) {
    if (!_.include(relationsTypes, w)) {
      throw new Meteor.Error('cannot load relation type ' + w);
    }
  });
};

let runNeo4jQuery = function(query) {
  let url = `${config.server}${config.endpoint}/transaction/commit`;
  let res = HTTP.post(url,
    {
      data: {
        statements: [
          {
            statement: query,
            resultDataContents: ['graph'],
            includeStats: false
          }
        ]
      },
      auth: `${config.user}:${config.pass}`
    },
  );

  if (res.data.errors.length > 0) {
    throw new Meteor.Error(res.data.errors);
  }
  // Returns the actual result of the query.
  // Something like [{graph: {...}}, {graph: {...}}]
  return res.data.results[0].data;
};