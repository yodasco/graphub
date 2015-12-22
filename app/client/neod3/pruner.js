// disects the nodes into three circles. Circle one is all nodes direclty
// connected ot the center node. - these nodes are to remain visible.
// circle two is all nodes that are not visible, but are connected to visible nodes
// these nodes will remain hidden.
// circle three is all other nodes - these nodes are to be removed.
PruneGraph = function(graph, centerNode, visibleRadius, hiddenRadius) {
  // First - clean up state
  graph.nodes().forEach(function(n) {
    delete n.hidden;
    n.fixed = false;
  });
  graph.relationships().forEach(function(r) {
    delete r.hidden;
  });

  // next, show the center node and fix its location
  centerNode.hidden = false;
  centerNode.fixed = true;

  // next, iterate over all relations for visibleRadius times and mark all
  // nodes connected to visible nodes as visible as well.
  _.times(visibleRadius, function() {
    let relsToAdd = {}, nodesToAdd = {};
    graph.relationships().forEach(function(rel) {
      if (rel.source.hidden === false || rel.target.hidden === false) {
        relsToAdd[rel.id] = true;
        nodesToAdd[rel.source.id] = true;
        nodesToAdd[rel.target.id] = true;
      }
    });
    _.keys(relsToAdd).forEach(function(relId) {
      graph.relationshipMap[relId].hidden = false;
    });
    _.keys(nodesToAdd).forEach(function(nodeId) {
      graph.nodeMap[nodeId].hidden = false;
    });
  });

  // Next, iterate over all relations for hiddenRadius and if we find a node
  // that isn't already visible, but connected to another node that is visible,
  // or connected to a node that is hidden - mark it as hidden.
  _.times(hiddenRadius, function() {
    let relsToAdd = {}, nodesToAdd = {};
    graph.relationships().forEach(function(rel) {
      if ((rel.source.hidden === false || rel.source.hidden === true) &&
          (_.isUndefined(rel.target.hidden) || rel.target.hidden)) {
        relsToAdd[rel.id] = true;
        nodesToAdd[rel.target.id] = true;
      }
      if ((rel.target.hidden === false || rel.target.hidden === true) &&
          (_.isUndefined(rel.source.hidden) || rel.source.hidden)) {
        relsToAdd[rel.id] = true;
        nodesToAdd[rel.source.id] = true;
      }
    });
    _.keys(relsToAdd).forEach(function(relId) {
      graph.relationshipMap[relId].hidden = true;
    });
    _.keys(nodesToAdd).forEach(function(nodeId) {
      graph.nodeMap[nodeId].hidden = true;
    });
  });

  // Finally, for each relationship or node that aren't already marked as either
  // visible or hidden - prune
  // prune all nodes that aren't vislbe or hidden
  graph.relationships().forEach(function(rel) {
    if (_.isUndefined(rel.hidden)) {
      delete graph.relationshipMap[rel.id];
    }
  });
  graph.nodes().forEach(function(node) {
    if (_.isUndefined(node.hidden)) {
      delete graph.nodeMap[node.id];
    }
  });

  graph._nodes = _.values(graph.nodeMap);
  graph._relationships = _.values(graph.relationshipMap);
};