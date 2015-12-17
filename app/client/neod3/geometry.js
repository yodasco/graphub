window.neo = window.neo || {};

neo.getGraphDimentions = function() {
  let width = $('#graph').width();
  let height = $(document).height() - $('#graph').position().top - 20;
  return {width, height};
};
