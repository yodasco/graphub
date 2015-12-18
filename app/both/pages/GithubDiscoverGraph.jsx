let relationTypes = {
  contributions: 'CONTRIBUTOR',
  members: 'MEMBER',
  forks: 'FORKED',
  stars: 'STAR'
};

GithubDiscoverGraph = React.createClass({
  propTypes: _.extend({
    user: React.PropTypes.string.isRequired,
  }, _.reduce(_.keys(relationTypes).map(function(r) {
    return {[r]: React.PropTypes.bool.isRequired};
  }), function(memo, e) {
    return _.extend(memo, e);
  })),
  render() {
    if (this.state.loading) {
      return (
        <div>
          <img className="img-responsive center-block image-rotating" src="/img/profile.png" alt=""/>
        </div>
      );
    }
    return (
      <div className='center-block text-center'>
        <div id='graph'>
          <svg></svg>
        </div>
      </div>
    );
  },
  componentDidMount() {
    loadGraph(this.props.user, this);
  },
  componentWillReceiveProps(nextProps) {
    let currentProps = this.props;
    let hasAdditions = false;
    _.keys(relationTypes).forEach(function(relType) {
      if (nextProps[relType] !== currentProps[relType]) {
        if (nextProps[relType]) {
          hasAdditions = true;
        } else {
          unloadRelations(relType);
        }
      }
    });
    let context = this;
    if (hasAdditions) {
      setTimeout(function() {
        loadRelations(context);
      }, 100);
    }
  },
  getInitialState() {
    return {
      loading: false,
    };
  },
});

let loadGraph = function(user, context) {
  if (user) {
    context.setState({loading: true});
    loadUser(user, context);
  } else {
    context.setState({loading: false});
  }
};
let currentGraph, currentView, currentNodeFocus;
let refreshGraph = function(graphs, loadedNodeName, whatJustLoaded, context) {
  if (!currentView) {
    $('#graph svg').html('');
    let {width, height} = neo.getGraphDimentions();
    $('#graph svg').width('100%').height(height);
    currentGraph = new neo.models.Graph();
    currentView =  new neo.graphView($('#graph svg')[0], currentGraph, new neo.style());
    neo.setupTooltip(currentView);
    currentView.on('nodeClicked', function(node) {
      loadMore(node, context);
    });
  }
  graphs.forEach(function(graph) {
    currentGraph.addNodes(graph.graph.nodes.map(neo.CypherGraphModel.convertNode()));
    currentGraph.addRelationships(graph.graph.relationships.map(neo.CypherGraphModel.convertRelationship(currentGraph)));
  });
  currentGraph.nodes().forEach(function(node) {
    if (node.propertyMap.login === loadedNodeName ||
        node.propertyMap.full_name === loadedNodeName) {
      node.isStartNode = true;
      currentNodeFocus = node;
      if (!node.loaded) {
        node.loaded = {};
      }
      node.loaded[whatJustLoaded] = true;
    }
  });
  currentView.update();
};

let loadMore = function(node, context) {
  currentGraph.nodes().forEach(function(n) {
    n.hidden = true;
    n.fixed = false;
  });
  currentGraph.relationships().forEach(function(rel) {
    if (rel.source.id === node.id || rel.target.id === node.id) {
      rel.hidden = rel.source.hidden = rel.target.hidden = false;
    } else {
      rel.hidden = true;
      rel.source.hidden &= true;
      rel.target.hidden &= true;
    }
  });

  node.hidden = false;
  node.fixed = true;

  pruneHidden();

  Session.set('loading-minor', true);
  if (_.include(node.labels, 'Repository')) {
    loadRepo(node.propertyMap.full_name, context);
  } else if (_.include(node.labels, 'User')) {
    loadUser(node.propertyMap.login, context);
  }
  currentView.update();
};

let pruneHidden = function() {
  currentGraph.nodes().forEach(function(node) {
    if (node.hidden) {
      delete currentGraph.nodeMap[node.id];
    }
  });
  currentGraph._nodes = _.values(currentGraph.nodeMap);
  currentGraph.relationships().forEach(function(rel) {
    if (rel.hidden) {
      delete currentGraph.relationshipMap[rel.id];
    }
  });
  currentGraph._relationships = _.values(currentGraph.relationshipMap);
};

let loadRepo = function(repoName, context) {
  let whatToLoad = getWhatToLoad(context);
  if (whatToLoad) {
    Meteor.call('discoverRepo', repoName, whatToLoad,
      (err, res)=> {
        Session.set('loading-minor', false);
        context.setState({loading: false});
        if (err) {
          console.error(err);
          return;
        }
        if (res) {
          refreshGraph(res, repoName, whatToLoad, context);
        }
      }
    );
  }
};

let loadUser = function(username, context) {
  let whatToLoad = getWhatToLoad(context);
  if (whatToLoad) {
    Meteor.call('discoverUser', username, whatToLoad,
      (err, res)=> {
        Session.set('loading-minor', false);
        context.setState({loading: false});
        if (err) {
          console.error(err);
          return;
        }
        if (res) {
          refreshGraph(res, username, whatToLoad, context);
        }
      }
    );
  }
};

let getWhatToLoad = function(context) {
  let what = [];
  _.forEach(context.props, function(v, k) {
    if (v && relationTypes[k]) {
      what.push(relationTypes[k]);
    }
  });
  if (what.length > 0) {
    return what.join('|');
  }
};

let unloadRelations = function(relationType) {
  currentGraph.relationships().forEach(function(rel) {
    if (rel.type === relationTypes[relationType]) {
      delete currentGraph.relationshipMap[rel.id];
    }
  });
  currentGraph._relationships = _.values(currentGraph.relationshipMap);
  pruneDisconnectedNodes(currentGraph);
  currentView.update();
};

let pruneDisconnectedNodes = function(g) {
  let connectedNodes = {};
  g.relationships().forEach(function(rel) {
    connectedNodes[rel.source.id] = true;
    connectedNodes[rel.target.id] = true;
  });
  g.nodes().forEach(function(node) {
    if (!connectedNodes[node.id] && !node.isStartNode) {
      delete g.nodeMap[node.id];
    }
  });
  g._nodes = _.values(g.nodeMap);
};

let loadRelations = function(context) {
  loadMore(currentNodeFocus, context);
};
