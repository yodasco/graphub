// Enriches the graph nodes and edges by calling the GH API
GithubEnrichGraph = function(graph) {
  graph.nodes().forEach(function(node) {
    if (IsRepo(node)) {
      enrichRepo(node, graph);
    } else if (IsUser(node)) {
      enrichUser(node);
    }
  });
};

IsRepo = function(node) {
  return _.include(node.labels, 'Repository');
};

IsUser = function(node) {
  return _.include(node.labels, 'User');
};

let enrichUser = function(node) {
  if (needsRefresh(node)) {
    Meteor.call('enrichUser', node.id, node.propertyMap.login, (err, res) => {
      if (err) {
        console.log(err);
        return;
      }
      _.extend(node.propertyMap, res);
    });
  }
};

let enrichRepo = function(node, graph) {
  if (needsRefresh(node)) {
    Meteor.call('enrichRepo', node.id, node.propertyMap.full_name, (err, res) => {
      if (err) {
        console.log(err);
        return;
      }
      if (res) {
        _.extend(node.propertyMap, res);
        if (res.contributors) {
          res.contributors.forEach(function(contributor) {
            let relationships = graph.findRelationshipsBySourceAndTarget('CONTRIBUTOR',
              {login: contributor.login},
              {'full_name': node.propertyMap.full_name});
            if (relationships && relationships.length) {
              let rel = relationships[0];
              rel.propertyMap.contributions = contributor.contributions;
            }
          });
        }
      }
    });
  }
};

// A week
const REFRESH_TIME_MILLI = 1000 * 60 * 60 * 24 * 7;
// const REFRESH_TIME_MILLI = 1000 * 60 * 60;

let needsRefresh = function(node) {
  if (node.propertyMap.lastLoadedFromGithub &&
      node.propertyMap.lastLoadedFromGithub > Date.now() - REFRESH_TIME_MILLI) {
    return false;
  }
  return true;
};