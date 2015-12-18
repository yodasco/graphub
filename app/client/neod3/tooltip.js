window.neo = window.neo || {};

let tooltip;
neo.setupTooltip = function(vis) {
  if (!tooltip) {
    tooltip = d3.select('body').append('div').attr('id', 'tooltip').style('opacity', 0);
  }
  vis.on('nodeMouseOver', function(node) {
    let html = getTooltipForNode(node);
    tooltip.transition().duration(200).style('opacity', .9);
    tooltip.html(html).
        style('left', (d3.event.pageX + 30) + 'px').
        style('top', (d3.event.pageY - 23) + 'px');
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
