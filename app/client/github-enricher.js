// Enriches the graph nodes and edges by calling the GH API
GithubEnrichGraph = function(graph) {
  init();
  graph.nodes().forEach(function(node) {
    if (IsRepo(node)) {
      enrichRepo(node);
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

let github;

let init = function() {
  if (!github) {
    github = new Github({
      token: Meteor.user().services.github.accessToken,
      auth: 'oauth'
    });
  }
};

const USER_ATTRIBUTES = ['avatar_url', 'bio', 'blog', 'company', 'email',
  'followers', 'hireable', 'html_url', 'location', 'name',
  'public_gists', 'public_repos', 'type', 'ghId'];

let enrichUser = function(node) {
  if (needsRefresh(node)) {
    let user = github.getUser();
    user.show(node.login, function(err, data) {
      if (err) {
        console.error(err);
        return;
      }
      node.propertyMap.lastLoadedFromGithub = Date.now();
      data.ghId = data.id;
      copyAttributes(node.propertyMap, data, USER_ATTRIBUTES);
      propogateDataBack(node);
    });
  }
};

let enrichRepo = function(repoNode) {

};

let propogateDataBack = function(node) {
  Meteor.call('updateNode', node.id, node.propertyMap, function(err, res) {
    if (err) {
      console.error(err);
    }
  });
};
let copyAttributes = function(target, source, attributeNames) {
  attributeNames.forEach(function(att) {
    target[att] = source[att];
  });
};

// A week
const REFRESH_TIME_MILLI = 1000 * 60 * 60 * 24 * 7;

let needsRefresh = function(node) {
  if (node.lastLoadedFromGithub &&
      node.lastLoadedFromGithub >  Date.now() - REFRESH_TIME_MILLI) {
    return false;
  }
  return true;
};