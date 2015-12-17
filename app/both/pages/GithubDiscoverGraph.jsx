GithubDiscoverGraph = React.createClass({
  propTypes: {
    user: React.PropTypes.string.isRequired,
    membership: React.PropTypes.bool.isRequired,
    contributions: React.PropTypes.bool.isRequired,
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
    loadGraph(this.props, this);
  },
  componentWillReceiveProps(nextProps) {
    loadGraph(nextProps, this);
  },
  getInitialState() {
    return {
      loading: false,
    };
  },
});

let loadGraph = function({user, membership, contributions}, context) {
  if (user) {
    context.setState({loading: true});
    loadUser(user, context);
  } else {
    context.setState({loading: false});
  }
};
let currentGraph, currentView;
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
      node.loaded = true;
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
    if (node.loaded) {
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

  if (!node.loaded) {
    if (_.include(node.labels, 'Repository')) {
      loadRepo(node.propertyMap.full_name, context);
    } else if (_.include(node.labels, 'User')) {
      loadUser(node.propertyMap.login, context);
    }
  }
  currentView.update();
};

let loadRepo = function(repoName, context) {
  let {membership, relationships} = context.props;
  Meteor.call('discoverRepo', repoName, {membership, relationships},
    (err, res)=> {
      if (err) {
        console.error(err);
        context.setState({loading: false});
        return;
      }
      context.setState({loading: false});
      if (res) {
        refreshGraph(res, repoName, context);
      }
    }
  );
};

let loadUser = function(username, context) {
  let {membership, relationships} = context.props;
  Meteor.call('discoverUser', username, {membership, relationships},
    (err, res)=> {
      if (err) {
        console.error(err);
        context.setState({loading: false});
        return;
      }
      context.setState({loading: false});
      if (res) {
        refreshGraph(res, username, context);
      }
    }
  );

};