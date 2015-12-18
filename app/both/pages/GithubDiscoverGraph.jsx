GithubDiscoverGraph = React.createClass({
  propTypes: {
    user: React.PropTypes.string.isRequired,
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
        <div id='loadMoreWhatDiv'>
          <button className='btn btn-default btn-block btn-xs' onClick={this.loadMoreMember}>Load more <strong>members</strong></button>
          <button className='btn btn-default btn-block btn-xs' onClick={this.loadMoreContributor}>Load more <strong>contributions</strong></button>
          <button className='btn btn-default btn-block btn-xs' onClick={this.loadMoreFork}>Load more <strong>forks</strong></button>
          <button className='btn btn-default btn-block btn-xs' onClick={this.loadMoreStar}>Load more <strong>stars</strong></button>
        </div>
      </div>
    );
  },
  componentDidMount() {
    loadGraph(this.props.user, this);
    $(document).mousemove(function(e) {
      pageMouseX = e.pageX;
      pageMouseY = e.pageY;
    }).mouseover();

  },
  getInitialState() {
    return {
      loading: false,
    };
  },
  loadMoreMember(e) {
    let callback = $('#loadMoreWhatDiv').data('callback');
    callback('MEMBER');
  },
  loadMoreContributor(e) {
    let callback = $('#loadMoreWhatDiv').data('callback');
    callback('CONTRIBUTOR');
  },
  loadMoreFork(e) {
    let callback = $('#loadMoreWhatDiv').data('callback');
    callback('FORKED');
  },
  loadMoreStar(e) {
    let callback = $('#loadMoreWhatDiv').data('callback');
    callback('STAR');
  },
});

let loadGraph = function(user, context) {
  if (user) {
    context.setState({loading: true});
    loadUser(user, 'MEMBER', context);
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
      loadMoreWhat(function(what) {
        $('#loadMoreWhatDiv').hide();
        loadMore(node, what, context);
      });
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

let loadMore = function(node, what, context) {
  currentGraph.nodes().forEach(function(n) {
    n.hidden = true;
    n.fixed = false;
  });
  currentGraph.relationships().forEach(function(rel) {
    if (node.loaded && node.loaded[what]) {
      if (rel.source.id === node.id || rel.target.id === node.id) {
        rel.hidden = rel.source.hidden = rel.target.hidden = false;
      } else {
        rel.hidden = true;
        rel.source.hidden &= true;
        rel.target.hidden &= true;
      }
    } else {
      rel.hidden = true;
    }
  });

  node.hidden = false;
  node.fixed = true;

  pruneHidden();

  if (node.loaded && node.loaded[what]) {
    Session.set('loading-minor', false);
  } else {
    Session.set('loading-minor', true);
    if (_.include(node.labels, 'Repository')) {
      loadRepo(node.propertyMap.full_name, what, context);
    } else if (_.include(node.labels, 'User')) {
      loadUser(node.propertyMap.login, what, context);
    }
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

let loadRepo = function(repoName, what, context) {
  Meteor.call('discoverRepo', repoName, what,
    (err, res)=> {
      Session.set('loading-minor', false);
      context.setState({loading: false});
      if (err) {
        console.error(err);
        return;
      }
      if (res) {
        refreshGraph(res, repoName, what, context);
      }
    }
  );
};

let loadUser = function(username, what, context) {
  Meteor.call('discoverUser', username, what,
    (err, res)=> {
      Session.set('loading-minor', false);
      context.setState({loading: false});
      if (err) {
        console.error(err);
        return;
      }
      if (res) {
        refreshGraph(res, username, what, context);
      }
    }
  );
};

let pageMouseX, pageMouseY;
let loadMoreWhat = function(callback) {
  let loadMoreWhatDiv = $('#loadMoreWhatDiv');
  loadMoreWhatDiv.show().offset({left: pageMouseX - 50, top: pageMouseY - 20});
  loadMoreWhatDiv.data('callback', callback);
};