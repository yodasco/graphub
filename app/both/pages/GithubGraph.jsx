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
    let html = getTooltipForNode(node);
    tooltip.transition().duration(200).style('opacity', .9);
    tooltip.html(html).
        style('left', (d3.event.pageX) + 'px').
        style('top', (d3.event.pageY - 28) + 'px');
  });
  vis.on('nodeMouseOut', function(node) {
    tooltip.transition().duration(500).style('opacity', 0);
  });
};

let getTooltipForNode = function(node) {
  let html = [];
  let pmap = node.propertyMap;
  if (_.include(node.labels, 'Repository')) {
    html.push(`<div class='name'>${pmap.full_name}</div>`);
    if (pmap.stargazers_count) {
      html.push(`<div class='stars'><i class="fa fa-star"></i> ${pmap.stargazers_count}</div>`);
    }
    if (pmap.forks_count) {
      html.push(`<div class='forks'><i class="fa fa-code-fork"></i> ${pmap.forks_count}</div>`);
    }
    if (pmap.language) {
      html.push(`<div class='language'><i class="fa fa-language"></i> ${pmap.language}</div>`);
    }
  }
  if (_.include(node.labels, 'User')) {
    if (pmap.avatar_url) {
      html.push(`<img class='img-rounded pull-right photo' src='${pmap.avatar_url}'/>`);
    }
    if (pmap.name) {
      html.push(`<div class='name'>${pmap.name} <small>(${pmap.login})</small></div>`);
    } else {
      html.push(`<div class='name'>${pmap.login}</div>`);
    }
    if (pmap.location) {
      html.push(`<div class='location'><i class="fa fa-globe"></i> ${pmap.location}</div>`);
    }
    if (pmap.company) {
      html.push(`<div class='company'><i class="fa fa-building-o"></i> ${pmap.company}</div>`);
    }
    if (pmap.blog) {
      html.push(`<div class='blog'><i class="fa fa-rss"></i> ${pmap.blog}</div>`);
    }
  }
  return html.join('');
};

let getGraphDimentions = function() {
  let width = $('#graph').width();
  let height = $(document).height() - $('#graph').position().top - 20;
  return {width, height};
};
