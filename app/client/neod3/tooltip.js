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

  vis.on('relMouseOver', function(rel) {
    let html = getTooltipForRel(rel);
    if (html && html.length) {
      tooltip.transition().duration(200).style('opacity', .9);
      tooltip.html(html).
          style('left', (d3.event.pageX + 30) + 'px').
          style('top', (d3.event.pageY - 23) + 'px');
    }
  });
  vis.on('relMouseOut', function(rel) {
    tooltip.transition().duration(500).style('opacity', 0);
  });
};

let getTooltipForRel = function(rel) {
  let html = [];
  let pmap = rel.propertyMap;
  if (rel.type === 'CONTRIBUTOR') {
    if (pmap.total) {
      html.push(`<div><strong>${escapeHtml(pmap.total)} commits</strong></div>`);
    }
    if (pmap.additions) {
      html.push(`<div><i class="fa fa-plus"></i> ${escapeHtml(pmap.additions)}</div>`);
    }
    if (pmap.deletions) {
      html.push(`<div><i class="fa fa-minus"></i> ${escapeHtml(pmap.deletions)}</div>`);
    }
  }
  return html.join('');
};

let getTooltipForNode = function(node) {
  let html = [];
  let pmap = node.propertyMap;
  if (IsRepo(node)) {
    html.push(`<div class='name'>${escapeHtml(pmap.full_name)}</div>`);
    if (pmap.description) {
      html.push(`<div class='description'>${escapeHtml(pmap.description)}</div>`);
    }
    if (pmap.stargazers_count) {
      html.push(`<div class='stars'><i class="fa fa-star"></i> ${escapeHtml(pmap.stargazers_count)}</div>`);
    }
    if (pmap.forks_count) {
      html.push(`<div class='forks'><i class="fa fa-code-fork"></i> ${escapeHtml(pmap.forks_count)}</div>`);
    }
    if (pmap.language) {
      html.push(`<div class='language'><i class="fa fa-language"></i> ${escapeHtml(pmap.language)}</div>`);
    }
  }
  if (IsUser(node)) {
    if (pmap.avatar_url) {
      html.push(`<img class='img-rounded pull-right photo' src='${escapeHtml(pmap.avatar_url)}'/>`);
    }
    if (pmap.name) {
      html.push(`<div class='name'>${escapeHtml(pmap.name)} <small>(${escapeHtml(pmap.login)})</small></div>`);
    } else {
      html.push(`<div class='name'>${escapeHtml(pmap.login)}</div>`);
    }
    if (pmap.location) {
      html.push(`<div class='location'><i class="fa fa-globe"></i> ${escapeHtml(pmap.location)}</div>`);
    }
    if (pmap.company) {
      html.push(`<div class='company'><i class="fa fa-building-o"></i> ${escapeHtml(pmap.company)}</div>`);
    }
    if (pmap.blog) {
      html.push(`<div class='blog'><i class="fa fa-rss"></i> ${escapeHtml(pmap.blog)}</div>`);
    }
  }
  return html.join('');
};

let escapeHtml = function(html) {
  if (_.isUndefined(html)) {
    return html;
  }
  if (!_.isString(html)) {
    return html;
  }
  return html.
    replace(/&/g, '&amp;').
    replace(/</g, '&lt;').
    replace(/>/g, '&gt;').
    replace(/"/g, '&quot;').
    replace(/'/g, '&#039;');
};