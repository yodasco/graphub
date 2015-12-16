GithubGraph = React.createClass({
  propTypes: {
    user1: React.PropTypes.string,
    user2: React.PropTypes.string,
  },
  render() {
    if (!this.state.initialized) {
      return <img className="img-responsive center-block" src="/img/profile.png" alt=""/>;
    }
    if (this.state.loading) {
      return (
        <div>
          <h4 className='text-center'>The shortest path between
            <code>{this.props.user1}</code> and <code>{this.props.user2}</code> is...
          </h4>
          <img className="img-responsive center-block image-rotating" src="/img/profile.png" alt=""/>
        </div>
      );
    }
    let distance = this.state.queryResult[0].graph.relationships.length / 2;
    return (
      <div className='center-block text-center'>
        <h4>The shortest path between <code>{this.props.user1}</code> and <code>{this.props.user2}</code> is <code><strong>{distance}</strong></code></h4>
        <div id='graph'>
          <svg></svg>
        </div>
      </div>
    );
  },
  componentWillReceiveProps(nextProps) {
    if (nextProps.user1 && nextProps.user2) {
      this.setState({loading: true, queryResult: null, initialized: true});
      Meteor.call('getAllShortestPaths', nextProps.user1,
                  nextProps.user2,
        (err, res)=> {
          if (err) {
            console.error(err);
            this.setState({loading: false, queryResult: null});
            return;
          }
          this.setState({queryResult: res, loading: false});
          renderGraphs(res, nextProps.user1, nextProps.user2);
        }
      );
    } else {
      this.setState({loading: false, queryResult: null, initialized: false});
    }
  },
  getInitialState() {
    return {
      queryResult: null,
      loading: false,
      initialized: false,
    };
  },
});

let renderGraphs = function(graphs, user1, user2) {
  $('#graph svg').html('');
  let {width, height} = getGraphDimentions();
  $('#graph svg').width('100%').height(height);
  let g = new neo.models.Graph();
  graphs.forEach(function(graph) {
    g.addNodes(graph.graph.nodes.map(neo.CypherGraphModel.convertNode()));
    g.addRelationships(graph.graph.relationships.map(neo.CypherGraphModel.convertRelationship(g)));
  });
  g.nodes().forEach(function(node) {
    if (node.propertyMap.login === user1) {
      node.isStartNode = true;
    }
    if (node.propertyMap.login === user2) {
      node.isEndNode = true;
    }
  });
  let view =  new neo.graphView($('#graph svg')[0], g, new neo.style());
  setupTooltip(view);
  view.update();
};

let tooltip;
let setupTooltip = function(vis) {
  if (!tooltip) {
    tooltip = d3.select('body').append('div').attr('id', 'tooltip').style('opacity', 0);
  }
  vis.on('nodeMouseOver', function(node) {
    // let html = neo.getTooltipForNode(node);
    let text = _.include(node.labels, 'Repository') ?
               node.propertyMap.full_name :
               node.propertyMap.login;
    tooltip.transition().duration(200).style('opacity', .9);
    tooltip.html(text).
        style('left', (d3.event.pageX) + 'px').
        style('top', (d3.event.pageY - 28) + 'px');
  });
  vis.on('nodeMouseOut', function(node) {
    tooltip.transition().duration(500).style('opacity', 0);
  });
};
let getGraphDimentions = function() {
  let width = $('#graph').width();
  let height = $(document).height() - $('#graph').position().top - 20;
  return {width, height};
};
