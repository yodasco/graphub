let relationTypes = {
  contributions: 'CONTRIBUTOR',
  members: 'MEMBER',
  forks: 'FORKED',
  stars: 'STAR'
};

GithubDiscoverGraph = React.createClass({
  propTypes: _.extend({
    startNode: React.PropTypes.string.isRequired,
    limit: React.PropTypes.number.isRequired,
    randomWalk: React.PropTypes.bool.isRequired,
  }, _.reduce(_.keys(relationTypes).map(function(r) {
    return {[r]: React.PropTypes.bool.isRequired};
  }), function(memo, e) {
    return _.extend(memo, e);
  })),
  render() {
    if (this.state.loading) {
      return (
        <div id='GithubDiscoverGraph'>
          <img className="img-responsive center-block image-rotating" src="/img/profile.png" alt="Loading..."/>
        </div>
      );
    }
    return (
      <div id='GithubDiscoverGraph' className='center-block text-center'>
        <div id='graph'>
          <svg></svg>
        </div>
      </div>
    );
  },
  componentDidMount() {
    loadGraph(this.props, this);
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
    let randomWalkJustStarting = false;
    if (nextProps.randomWalk !== currentProps.randomWalk) {
      if (nextProps.randomWalk) {
        randomStep(context);
        randomWalkJustStarting = true;
      }
    }
    let startNodeChanged = nextProps.startNode !== currentProps.startNode;
    let limitChanged = nextProps.limit !== currentProps.limit;
    if (startNodeChanged || limitChanged) {
      setTimeout(function() {
        loadGraph(nextProps, context);
      }, 100);
      return;
    }
    if (hasAdditions &&
        !randomWalkJustStarting &&
        !currentProps.randomWalk) {
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

let loadGraph = function(props, context) {
  let startNode = props.startNode;
  if (startNode) {
    context.setState({loading: true});
    currentView = null;
    currentGraph = null;
    if (startNode.indexOf('/') > 0) {
      loadRepo(props, context);
    } else {
      loadUser(props, context);
    }
  } else {
    context.setState({loading: false});
  }
};
let currentGraph, currentView, currentNodeFocus;
let refreshGraph = function(graphs, loadedNodeName, context) {
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
    }
  });
  GithubEnrichGraph(currentGraph);
  currentView.update();
  if (context.props.randomWalk) {
    setTimeout(function() {
      if (context.props.randomWalk) {
        randomStep(context);
      }
    }, 1000);
  }
};

// disects the nodes into three circles. Circle one is all nodes direclty
// connected ot the center node. - these nodes are to remain visible.
// circle two is all nodes that are not visible, but are connected to visible nodes
// these nodes will remain hidden.
// circle three is all other nodes - these nodes are to be removed.
let hideAndPruneNodes = function(centerNode) {
  // First - clean up state
  currentGraph.nodes().forEach(function(n) {
    delete n.hidden;
    n.fixed = false;
  });
  currentGraph.relationships().forEach(function(r) {
    delete r.hidden;
  });

  // next, show the center node
  centerNode.hidden = false;
  centerNode.fixed = true;

  // next, iterate over all relations and mark all connected nodes as hidden
  currentGraph.relationships().forEach(function(rel) {
    if (rel.source.id === centerNode.id || rel.target.id === centerNode.id) {
      rel.hidden = rel.source.hidden = rel.target.hidden = false;
    }
  });

  // Next, iterate over all relations and if we find a node that's not visible,
  // but connected to another node that is visible - mark it as hidden.
  currentGraph.relationships().forEach(function(rel) {
    if (rel.source.hidden === false && (_.isUndefined(rel.target.hidden) || rel.target.hidden)) {
      rel.hidden = rel.target.hidden = true;
    }
    if (rel.target.hidden === false && (_.isUndefined(rel.source.hidden) || rel.source.hidden)) {
      rel.hidden = rel.source.hidden = true;
    }
    // prune the rel
    if ((rel.source.hidden === true || _.isUndefined(rel.source.hidden)) &&
        (rel.target.hidden === true || _.isUndefined(rel.target.hidden))) {
      delete currentGraph.relationshipMap[rel.id];
    }
  });

  // prune all nodes that aren't vislbe or hidden
  currentGraph.nodes().forEach(function(node) {
    if (_.isUndefined(node.hidden)) {
      delete currentGraph.nodeMap[node.id];
    }
  });

  currentGraph._nodes = _.values(currentGraph.nodeMap);
  currentGraph._relationships = _.values(currentGraph.relationshipMap);
};

let loadMore = function(node, context) {
  hideAndPruneNodes(node);
  Session.set('loading-minor', true);
  let props = _.clone(context.props);
  if (IsRepo(node)) {
    props.startNode = node.propertyMap.full_name;
    loadRepo(props, context);
  } else if (IsUser(node)) {
    props.startNode = node.propertyMap.login;
    loadUser(props, context);
  }
};

let loadRepo = function(props, context) {
  let repoName = props.startNode;
  let limit = props.limit;
  let whatToLoad = getWhatToLoad(props);
  if (whatToLoad) {
    Meteor.call('discoverRepo', repoName, whatToLoad, limit,
      (err, res)=> {
        Session.set('loading-minor', false);
        context.setState({loading: false});
        if (err) {
          console.error(err);
          return;
        }
        if (res) {
          refreshGraph(res, repoName, context);
        }
      }
    );
  }
};

let loadUser = function(props, context) {
  let username = props.startNode;
  let limit = props.limit;
  let whatToLoad = getWhatToLoad(props);
  if (whatToLoad) {
    Meteor.call('discoverUser', username, whatToLoad, limit,
      (err, res)=> {
        Session.set('loading-minor', false);
        context.setState({loading: false});
        if (err) {
          console.error(err);
          return;
        }
        if (res) {
          refreshGraph(res, username, context);
        }
      }
    );
  }
};

let getWhatToLoad = function(props) {
  let what = [];
  _.forEach(props, function(v, k) {
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

let randomStep = function(context) {
  let visibleNodes = currentGraph.nodes().filter(function(n) {
    return !n.hidden;
  });
  let randomNode = Random.choice(visibleNodes);
  loadMore(randomNode, context);
};
