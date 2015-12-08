let seraph = Meteor.npmRequire('seraph');
let connectionConfig = Meteor.settings.neo4j;
Meteor.methods({
  getShortestPath(user1, user2) {
    let db = seraph(connectionConfig);
    let query = `MATCH (u1:User {login: '${user1}'}),
                       (u2:User {login: '${user2}'}),
                       p = shortestPath((u1)-[*]-(u2))
                 RETURN u1, p, u2`;
    let res = Async.runSync(function(done) {
      db.query(query, function(err, data) {
        done(null, data);
      });
    });
    return res.result;
  }
});