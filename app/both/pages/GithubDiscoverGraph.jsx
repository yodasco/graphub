GithubDiscoverGraph = React.createClass({
  propTypes: {
    user: React.PropTypes.string.isRequired,
    members: React.PropTypes.bool.isRequired,
    contributions: React.PropTypes.bool.isRequired,
    forks: React.PropTypes.bool.isRequired,
    stars: React.PropTypes.bool.isRequired,
  },
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
let currentGraph, currentView;
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
  if (context.props.contributions) {
    what.push('CONTRIBUTOR');
  }
  if (context.props.members) {
    what.push('MEMBER');
  }
  if (context.props.forks) {
    what.push('FORKED');
  }
  if (context.props.stars) {
    what.push('STAR');
  }
  if (what.length > 0) {
    return what.join('|');
  }
};