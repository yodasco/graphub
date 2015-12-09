let config = Meteor.settings.neo4j;
Meteor.methods({
  getShortestPath(user1, user2) {
    let query = `MATCH (u1:User {login: '${user1}'}),
                       (u2:User {login: '${user2}'}),
                       p = shortestPath((u1)-[*]-(u2))
                 RETURN p`;
    return runNeo4jQuery(query);
  },
  getAllShortestPaths(user1, user2) {
    let query = `MATCH (u1:User {login: '${user1}'}),
                       (u2:User {login: '${user2}'}),
                       p = allShortestPaths((u1)-[*]-(u2))
                 RETURN p limit 10`;
    return runNeo4jQuery(query);
  }
});

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