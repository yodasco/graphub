let config = Meteor.settings.neo4j;
let seraph = Meteor.npmRequire('seraph');
let db = seraph(config);

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
  discoverUser(user, what) {
    check(user, String);
    checkWhat(what);
    let query = `MATCH (u:User {login: '${user}'})-[rel:${what}]->(r:Repository)
                 return * limit 100`;
    return runNeo4jQuery(query);
  },
  discoverRepo(repoName, what) {
    check(repoName, String);
    checkWhat(what);
    let query = `MATCH (r:Repository {full_name: '${repoName}'})<-[rel:${what}]-(u:User)
                 return * limit 100`;
    return runNeo4jQuery(query);
  },
  updateNode(id, nodeData) {
    check(id, String);
    check(nodeData, Object);
    this.unblock();
    nodeData.id = parseInt(id);
    removeNulls(nodeData);
    let res = Async.runSync(function(done) {
      db.save(nodeData, function(err, data) {
        if (err) {
          console.error(err);
        }
        done(err, data);
      });
    });
    return res.result;
  },
  deleteNodeAndRelations(id) {
    check(id, String);
    this.unblock();
    let res = Async.runSync(function(done) {
      let force = true;
      db.delete(id, force, function(err, data) {
        if (err) {
          console.error(err);
        }
        done(err, data);
      });
    });
    return res.result;
  },
  updateAndAddContributions(contributions) {
    check(contributions, [Object]);
    this.unblock();
    contributions.forEach(function(contribution) {
      contribution.contributor = addOrUpdateContributor(contribution.contributor);
      let rel = addOrUpdateContribution(contribution);
    });
  },
});

let addOrUpdateContribution = function(contribution) {
  let res = Async.runSync(function(done) {
    let updateQuery = `match (u:User)-[rel:CONTRIBUTOR]->(r:Repository)
         where id(u) = ${contribution.contributor.id}
           and id(r) = ${contribution.repo.id}
         set rel.total = ${contribution.total},
           rel.additions = ${contribution.additions},
           rel.deletions = ${contribution.deletions}
         return rel`;
    db.query(updateQuery, done);
  });
  return res.results;
};

let addOrUpdateContributor = function(contributorData) {
  let res = Async.runSync(function(done) {
    db.find({login: contributorData.login}, 'User', function(err, data) {
      if (err) {
        done(err, null);
        return;
      }
      if (data && data.length) {
        // Node found - update it by id
        contributorData.id = data[0].id;
        db.save(contributorData, function(err, res) {
          // When updating a node - seraph would not return its data. So we use
          // the update object to return the result
          done(err, contributorData);
        });
      } else {
        // Node not found - create it (saving without an ID creates a node)
        db.save(contributorData, 'User', done);
      }
    });
  });
  return res.result;
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