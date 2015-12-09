GithubGraph = React.createClass({
  propTypes: {
    user1: React.PropTypes.string,
    user2: React.PropTypes.string,
  },
  render() {
    return (
      <div>
        <h1>Shortest path between <code>{this.props.user1}</code> and <code>{this.props.user2}</code></h1>
        <div id='graph'></div>
      </div>
    );
  },
  componentWillReceiveProps(nextProps) {
    if (nextProps.user1 && nextProps.user2) {
      Meteor.call('getShortestPath', nextProps.user1,
                  nextProps.user2,
        (err, res)=> {
          if (err) {
            console.error(err);
            return;
          }
          // this.setState({queryResult: res});
          renderGraph(res.graph);
        }
      );
    }
  },
  getInitialState() {
    return {queryResult: null};
  },
  componentDidMount() {
    renderGraph(graph);
  }
});

// Creates a d3 model from the result of neo4j
let buildModel = function(graph) {
  let color = d3.scale.category20();
  let index = {}; // An index of node IDs to node index in the nodes array
  graph.nodes.forEach(function(node, i) {
    index[node.id] = i;
  });
  let model = {
    nodes: graph.nodes.map(function(n) {
      if (_.include(n.labels, 'User')) {
        n.name = n.properties.login;
        n.type = 'user';
        n.color = color(n.type);
      }
      if (_.include(n.labels, 'Repository')) {
        n.name = n.properties.full_name;
        n.type = 'repo';
        n.color = color(n.type);
      }
      return n;
    }),
    links: graph.relationships.map(function(r) {
      r.source = index[r.startNode];
      r.target = index[r.endNode];
      return r;
    })
  };
  return model;
};
let click = function(d) {
  if (d3.event.defaultPrevented) {
    return; // ignore drag
  }
};
// Defines the arrow for svg
let defineArrow = function(svg) {

  svg.append('defs').selectAll('marker').
      data(['arrow-head']).
    enter().append('marker').
      attr('id', function(d) { return d; }).
      attr('viewBox', '0 -5 10 10').
      attr('refX', 25).
      attr('refY', 0).
      attr('markerWidth', 6).
      attr('markerHeight', 6).
      attr('orient', 'auto').
    append('path').
      attr('d', 'M0,-5L10,0L0,5 L10,0 L0, -5').
      style('stroke', '#4679BD');
};

let createLink = function(svg, model, force) {
  let link = svg.selectAll('.link').data(model.links);
  link.enter().append('line').
    attr('class', function(d) {
      return `link ${d.type}`;
    }).
    style('stroke-width', function(d) { return 1; }).
    style('marker-end',  'url(#arrow-head)') ;


  let linkpaths = svg.selectAll('.linkpath').
      data(model.links).
      enter().
      append('path').
      attr({
        'class': 'linkpath',
        'id': function(d, i) { return 'linkpath' + i;}
      }).
      style('pointer-events', 'none');

  let linklabels = svg.selectAll('.linklabel').
      data(model.links).
      enter().
      append('text').
      style('pointer-events', 'none').
      attr({
        'class': function(d) {return `linklabel ${d.type}`;},
        'dx': 20,
        'dy': -5,
      });

  linklabels.append('textPath').
      attr('xlink:href',function(d,i) {return '#linkpath' + i;}).
      style('pointer-events', 'none').
      text(function(d, i) {
        return d.type;
      });



  link.exit().remove();
  return {link, linkpaths, linklabels};
};

let createNode = function(svg, model, force) {
  let node = svg.selectAll('.node').
      data(model.nodes);

  let nodeEnter = node.enter().append('g').
      attr('class', 'node').
      call(force.drag);
  nodeEnter.append('circle').
      attr('r', 8).
      style('fill', function(d) {return d.color;});
  nodeEnter.append('text').
        attr('dx', 10).
        attr('dy', '.35em').
        text(function(d) {return d.name || d.id;});

  node.exit().remove();
  return node;
};

let createSvg = function(width, height) {
  d3.select('#graph').selectAll('svg').remove();
  let svg = d3.select('#graph').append('svg').
      attr('width', width).
      attr('height', height);

  defineArrow(svg);

  svg.append('rect').
      attr('width', width).
      attr('height', height);
  return svg;
};
let createForce = function(model) {
  let tick = function() {
    link.attr('x1', function(d) { return d.source.x; }).
        attr('y1', function(d) { return d.source.y; }).
        attr('x2', function(d) { return d.target.x; }).
        attr('y2', function(d) { return d.target.y; });
    node.attr('transform', function(d) {
      return 'translate(' + d.x + ',' + d.y + ')';
    });
    linkpaths.attr('d', function(d) {
      return `M ${d.source.x} ${d.source.y} L ${d.target.x} ${d.target.y}`;
    });

    linklabels.attr('transform', function(d, i) {
      if (d.target.x < d.source.x) {
        let bbox = this.getBBox();
        let rx = bbox.x + bbox.width / 2;
        let ry = bbox.y + bbox.height / 2;
        return `rotate(180 ${rx} ${ry})`;
      } else {
        return 'rotate(0)';
      }
    });
  };

  let width = $(document).width(), height = 300;
  let fill = d3.scale.category20();
  let force = d3.layout.force().
      size([width, height]).
      nodes(model.nodes).
      links(model.links).
      linkDistance(100).
      charge(-1200).
      theta(0.1).
      gravity(0.1).
      on('tick', tick);

  let svg = createSvg(width, height);
  let {link, linkpaths, linklabels} = createLink(svg, model, force);
  let node = createNode(svg, model, force);
  return force;
};

let renderGraph = function(graph) {
  let model = buildModel(graph);
  let force = createForce(model);
  force.start();
};

let graph = {
   "nodes":[
      {
         "id":"90603",
         "labels":[
            "User"
         ],
         "properties":{
            "login":"dhh"
         }
      },
      {
         "id":"1505",
         "labels":[
            "Repository"
         ],
         "properties":{
            "full_name":"rails/rails"
         }
      },
      {
         "id":"1112627",
         "labels":[
            "User"
         ],
         "properties":{
            "login":"AvnerCohen"
         }
      },
      {
         "id":"15287",
         "labels":[
            "User"
         ],
         "properties":{
            "login":"rantav"
         }
      },
      {
         "id":"12318337",
         "labels":[
            "Repository"
         ],
         "properties":{
            "full_name":"rantav/reversim-summit-2015"
         }
      }
   ],
   "relationships":[
      {
         "id":"12820361",
         "type":"CONTRIBUTOR",
         "startNode":"1112627",
         "endNode":"1505",
         "properties":{

         }
      },
      {
         "id":"13842876",
         "type":"CONTRIBUTOR",
         "startNode":"15287",
         "endNode":"12318337",
         "properties":{

         }
      },
      {
         "id":"14093900",
         "type":"CONTRIBUTOR",
         "startNode":"1112627",
         "endNode":"12318337",
         "properties":{

         }
      },
      {
         "id":"156182",
         "type":"CONTRIBUTOR",
         "startNode":"90603",
         "endNode":"1505",
         "properties":{

         }
      }
   ]
};
