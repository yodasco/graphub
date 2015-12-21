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
                 RETURN p limit 100`;
    return runNeo4jQuery(query);
  },
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
  discoverRepo(repoName, what, limit) {
    console.log({discoverRepo: repoName});
    check(repoName, String);
    checkWhat(what);
    check(limit, Match.Integer);
    limit = Math.min(limit, 100);
    let query = `MATCH (r:Repository {full_name: '${repoName}'})-[rel:${what}]-(n)
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
    let contributors = gh.repos.getContributors({user, repo});
    let withContributions = USER_ATTRIBUTES.concat(['contributions', 'login']);
    contributors = contributors.map(function(contributor) {
      let ret = pluckAttributes(contributor, withContributions);
      ret.ghId = contributor.id;
      return ret;
    });
    reducedRepo.contributors = contributors;
    later(function() {
      updateAndAddContributors(nodeId, contributors);
    });
    return reducedRepo;
  },
});

let later = function(func) {
  return Meteor.setTimeout(func, 0);
};

let updateAndAddContributors = function(repoId, contributors) {
  check(repoId, Match.OneOf(String, Match.Integer));
  check(contributors, [Object]);
  contributors.forEach(function(contributor) {
    let contributions = contributor.contributions;
    delete contributor.contributions;
    let contributorNode = addOrUpdateContributor(contributor);
    let lastLoadedFromGithub = Date.now();
    let rel = addOrUpdateContribution(contributorNode.id,
                                      {contributions, lastLoadedFromGithub},
                                      repoId);
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
      throw e;
    }
  }
};

let updateNode = function(nodeData) {
  check(nodeData, Object);
  check(nodeData.id, Match.OneOf(Match.Integer, String));
  nodeData.id = parseInt(nodeData.id);
  removeNulls(nodeData);
  return db.save(nodeData);
};

const USER_ATTRIBUTES = ['created_at', 'avatar_url', 'bio', 'blog', 'company', 'email',
  'followers', 'hireable', 'html_url', 'location', 'name',
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

  let wrappedUserApi = Async.wrap(github.user, ['getFrom']);
  let wrappedReposApi = Async.wrap(github.repos, ['get', 'getContributors']);
  return {user: wrappedUserApi, repos: wrappedReposApi};
};

let addOrUpdateContribution = function(userId, properties, repoId) {
  properties.lastLoadedFromGithub = Date.now();
  let updateQuery = `match (u:User)-[rel:CONTRIBUTOR]->(r:Repository)
       where id(u) = ${userId}
         and id(r) = ${repoId}
       set rel.contributions = ${properties.contributions},
         rel.lastLoadedFromGithub = ${properties.lastLoadedFromGithub}
       return rel`;
  let ret = db.query(updateQuery);
  if (ret && ret.length > 0) {
    // relationship already exists. Return it
    return ret[0];
  }
  // Create relationship
  return db.relate(userId, 'CONTRIBUTOR', repoId, properties);
};

let addOrUpdateContributor = function(contributorData) {
  contributorData.lastLoadedFromGithub = Date.now();
  let data = db.find({login: contributorData.login}, 'User');
  if (data && data.length) {
    // Node found - update it by id
    contributorData.id = data[0].id;
    db.save(contributorData);
    return contributorData;
  } else {
    // Node not found - create it (saving without an ID creates a node)
    return db.save(contributorData, 'User');
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