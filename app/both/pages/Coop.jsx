Coop = React.createClass({
  mixins: [ReactMeteorData],
  render() {
    if (this.data.currentUser) {
      let options =
        <div className="btn-group pull-right">
          <button type="button" className="btn btn-default btn-xs dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
            Options <span className="caret"></span>
          </button>
          <ul className="dropdown-menu">
            <li>
              <label>Start from
                <input type="text" onKeyDown={this.onInputKeyPress} defaultValue={this.data.startNode}
                  ref='startNode'/>
              </label>
            </li>
            <li>
              <label>Limit
                <input type="text" onKeyDown={this.onInputKeyPress} defaultValue={this.state.limit}
                  ref='limit'/>
              </label>
            </li>
          </ul>
        </div>;

      return (
        <section id='graph-section'>
          {options}
          <div className="container-fluid">
            <CoopGraph startNode={this.data.startNode} limit={this.state.limit}/>
          </div>
        </section>
      );
    } else {
      return Home.loginCallToAction;
    }
  },
  getMeteorData() {
    let user = Meteor.user();
    if (user) {
      let startNode = this.state.startNode || user.services.github.username;
      return {
        currentUser: user,
        startNode
      };
    } else {
      return {};
    }
  },
  getInitialState() {
    return {
      startNode: null,
      limit: 10,
    };
  },
  onInputKeyPress(e) {
    if (e.keyCode === 13) {
      // Enter pressed
      let startNode = ReactDOM.findDOMNode(this.refs.startNode).value.trim();
      let limit = parseInt(ReactDOM.findDOMNode(this.refs.limit).value.trim());
      if (startNode) {
        this.setState({startNode, limit});
      }
    }
  },
});

let CoopGraph = React.createClass({
  propTypes: {
    startNode: React.PropTypes.string.isRequired,
    limit: React.PropTypes.number.isRequired,
  },
  render() {
    if (this.state.loading) {
      return (
        <div id='CoopGraph'>
          <img className="img-responsive center-block image-rotating" src="/img/profile.png" alt="Loading..."/>
        </div>
      );
    }
    return (
      <div id='CoopGraph' className='center-block text-center'>
        <h3>GitHub users who cooperated with <code>{this.state.login}</code> on various projects</h3>
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
    let context = this;
    let startNodeChanged = nextProps.startNode !== currentProps.startNode;
    let limitChanged = nextProps.limit !== currentProps.limit;
    if (startNodeChanged || limitChanged) {
      loadGraph(nextProps, context);
      return;
    }
    this.setState({login: nextProps.startNode});
  },
  getInitialState() {
    return {
      loading: false,
      login: '...'
    };
  },
});

let loadGraph = function(props, context) {
  let startNode = props.startNode;
  if (startNode) {
    context.setState({loading: true});
    currentView = null;
    currentGraph = null;
    loadCoops(props, context);
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
      if (IsUser(node)) {
        loadMore(node, context);
      }
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
};


let loadMore = function(node, context) {
  PruneGraph(currentGraph, node, 2, 0);
  Session.set('loading-minor', true);
  let props = _.clone(context.props);
  props.startNode = node.propertyMap.login;
  loadCoops(props, context);
};

let loadCoops = function(props, context) {
  let username = props.startNode;
  let limit = props.limit;
  Meteor.call('getCoopsForUser', username, limit,
    (err, res)=> {
      Session.set('loading-minor', false);
      context.setState({loading: false, login: username});
      if (err) {
        console.error(err);
        return;
      }
      if (res) {
        refreshGraph(res, username, context);
      }
    }
  );
};
