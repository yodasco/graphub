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
      </div>
    );
  },
  componentDidMount() {
    let user = this.props.user;
    if (this.props.user) {
      this.setState({loading: true, queryResult: null});
      Meteor.call('discoverUser', user,
        (err, res)=> {
          if (err) {
            console.error(err);
            this.setState({loading: false, queryResult: null});
            return;
          }
          this.setState({queryResult: res, loading: false});
          renderInitialGraph(res, user);
        }
      );
    } else {
      this.setState({loading: false, queryResult: null});
    }
  },
  getInitialState() {
    return {
      queryResult: null,
      loading: false,
    };
  },
});

let renderInitialGraph = function(graphs, user) {
  $('#graph svg').html('');
  let {width, height} = neo.getGraphDimentions();
  $('#graph svg').width('100%').height(height);
  let g = new neo.models.Graph();
  graphs.forEach(function(graph) {
    g.addNodes(graph.graph.nodes.map(neo.CypherGraphModel.convertNode()));
    g.addRelationships(graph.graph.relationships.map(neo.CypherGraphModel.convertRelationship(g)));
  });
  g.nodes().forEach(function(node) {
    if (node.propertyMap.login === user) {
      node.isStartNode = true;
    }
  });
  let view =  new neo.graphView($('#graph svg')[0], g, new neo.style());
  neo.setupTooltip(view);
  view.update();
};
