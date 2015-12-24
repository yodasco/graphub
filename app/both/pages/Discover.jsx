Discover = React.createClass({
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
              <div className="checkbox">
                <label>
                  <input type="checkbox" onChange={this.onChange} defaultChecked={this.state.members}
                    ref='members'/> Load members
                </label>
              </div>
            </li>
            <li>
              <div className="checkbox">
                <label>
                  <input type="checkbox" onChange={this.onChange} defaultChecked={this.state.contributions}
                    ref='contributions'/> Load contributions
                </label>
              </div>
            </li>
            <li>
              <div className="checkbox">
                <label>
                  <input type="checkbox" onChange={this.onChange} defaultChecked={this.state.forks}
                    ref='forks'/> Load forks
                </label>
              </div>
            </li>
            <li>
              <div className="checkbox">
                <label>
                  <input type="checkbox" onChange={this.onChange} defaultChecked={this.state.stars}
                    ref='stars'/> Load stars
                </label>
              </div>
            </li>
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
      let randomWalk = this.state.randomWalk ?
        <button className='btn btn-success btn-xs pull-left' onClick={this.stopRandomWalk}>Stop</button> :
        <button className='btn btn-default btn-xs pull-left' onClick={this.startRandomWalk}>Random walk</button>;

      return (
        <section id='graph-section'>
          {options}
          {randomWalk}
          <div className="container-fluid">
            <GithubDiscoverGraph startNode={this.data.startNode} limit={this.state.limit}
                members={this.state.members} contributions={this.state.contributions}
                forks={this.state.forks} stars={this.state.stars}
                randomWalk={this.state.randomWalk}/>
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
      members: true,
      contributions: false,
      forks: false,
      stars: false,
      randomWalk: false,
      limit: 10,
    };
  },
  onChange() {
    let members = ReactDOM.findDOMNode(this.refs.members).checked;
    let contributions = ReactDOM.findDOMNode(this.refs.contributions).checked;
    let forks = ReactDOM.findDOMNode(this.refs.forks).checked;
    let stars = ReactDOM.findDOMNode(this.refs.stars).checked;
    this.setState({members, contributions, forks, stars});
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
  startRandomWalk() {
    this.setState({randomWalk: true});
  },
  stopRandomWalk() {
    this.setState({randomWalk: false});
  }
});

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
      loadGraph(nextProps, context);
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

let loadMore = function(node, context) {
  PruneGraph(currentGraph, node, 1, 1);
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
