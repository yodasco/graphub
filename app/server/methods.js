let config = Meteor.settings.neo4j;
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
  discoverUser(user, {membership, contributions}) {
    check(user, String);
    check(membership, Match.Optional(Boolean));
    check(contributions, Match.Optional(Boolean));
    let relationshipTypes = [];
    if (membership) {
      relationshipTypes.push('MEMBER');
    }
    if (contributions) {
      relationshipTypes.push('CONTRIBUTOR');
    }
    if (relationshipTypes.length === 0) {
      return;
    }
    relationshipTypes = relationshipTypes.join('|');
    let query = `MATCH (u:User {login: '${user}'})-[rel:${relationshipTypes}]->(r:Repository)
                 return * limit 100`;
    return runNeo4jQuery(query);
  },
  discoverRepo(repoName, {membership, contributions}) {
    check(repoName, String);
    check(membership, Match.Optional(Boolean));
    check(contributions, Match.Optional(Boolean));
    let relationshipTypes = [];
    if (membership) {
      relationshipTypes.push('MEMBER');
    }
    if (contributions) {
      relationshipTypes.push('CONTRIBUTOR');
    }
    if (relationshipTypes.length === 0) {
      return;
    }
    relationshipTypes = relationshipTypes.join('|');
    let query = `MATCH (r:Repository {full_name: '${repoName}'})<-[rel:${relationshipTypes}]-(u:User)
                 return * limit 100`;
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