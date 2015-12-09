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

let renderGraph = function(graph) {
  let index = {}; // An index of node IDs to node index in the nodes array
  graph.nodes.forEach(function(node, i) {
    index[node.id] = i;
  });
  let model = {
    nodes: graph.nodes.map(function(n) {
      if (_.include(n.labels, 'User')) {
        n.name = n.properties.login;
        n.type = 'user';
        n.color = '#ff9';
      }
      if (_.include(n.labels, 'Repository')) {
        n.name = n.properties.full_name;
        n.type = 'repo';
        n.color = '#f9f';
      }
      return n;
    }),
    links: graph.relationships.map(function(r) {
      r.source = index[r.startNode];
      r.target = index[r.endNode];
      return r;
    })
  };
  let tick = function() {
    link.attr('x1', function(d) { return d.source.x; }).
        attr('y1', function(d) { return d.source.y; }).
        attr('x2', function(d) { return d.target.x; }).
        attr('y2', function(d) { return d.target.y; });
    node.attr('transform', function(d) {
      return 'translate(' + d.x + ',' + d.y + ')';
    });
  };

  let click = function(d) {
    if (d3.event.defaultPrevented) {
      return; // ignore drag
    }
  };

  let width = $(document).width(), height = 300;
  let fill = d3.scale.category20();
  let force = d3.layout.force().
      size([width, height]).
      nodes(model.nodes).
      links(model.links).
      linkDistance(50).
      charge(-1000).
      on('tick', tick);

  d3.select('#graph').selectAll('svg').remove();
  let svg = d3.select('#graph').append('svg').
      attr('width', width).
      attr('height', height);

  svg.append('rect').
      attr('width', width).
      attr('height', height);

  let nodes = force.nodes();
  let links = force.links();

  let link = svg.selectAll('.link').data(model.links);
  link.enter().insert('line', '.node').attr('class', 'link');
  link.exit().remove();

  let node = svg.selectAll('.node').data(model.nodes);

  let nodeEnter = node.enter().
    insert('g').
    attr('class', 'node').
    attr('fill', function(d) {return d.color;});

  nodeEnter.insert('circle').attr('r', 25);
  nodeEnter.insert('text').text(function(d) {
    return d.name || d.id;
  });

  node.on('click', click).call(force.drag);
  node.exit().remove();

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
