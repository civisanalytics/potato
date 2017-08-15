const d3 = require('./d3.v4.min.js');

// A variety of helper methods for tooltips
function Tooltip() {
}


Tooltip.prototype.showDetails = function(content, element) {
  d3.select("#node-tooltip").html(content).style("display", "block");

  Tooltip.prototype.toggleNodeHighlight(element, true);

  Tooltip.prototype.updateTooltipPosition(d3.event, "node-tooltip");
};

Tooltip.prototype.hideDetails = function(element) {
  d3.select("#node-tooltip").style("display", "none");

  Tooltip.prototype.toggleNodeHighlight(element, false);
};

Tooltip.prototype.toggleNodeHighlight = function(elementID, highlight) {
  var element = d3.select(elementID);

  // ignore custom colors
  if (element.attr("class") !== undefined) {
    var sWidth = highlight ? element.attr("r") * 0.3 : 0;

    // temporarily make the circle "bigger"
    // this has the effect of making the border appear "around" the existing circle
    // rather than "just inside" the circle
    element.attr("r", function(d) { return d.radius + (sWidth / 2.0); })
           .attr("stroke-width", sWidth);
  }
};

Tooltip.prototype.updateTooltipPosition = function(e, id) {
  var xOffset = 20;
  var yOffset = 10;
  var rect = d3.select("#" + id).node().getBoundingClientRect();
  var ttw = rect.width;
  var tth = rect.height;

  // If the tooltip is on the right or bottom edge, then flip the tooltip to keep on the screen.
  var ttleft = (e.pageX + xOffset * 2 + ttw) > window.innerWidth ? e.pageX - ttw - xOffset * 2 : e.pageX + xOffset;
  var tttop = (e.pageY + yOffset * 2 + tth) > window.innerHeight ? e.pageY - tth - yOffset * 2 : e.pageY + yOffset;

  d3.select("#" + id)
    .style("top", tttop + 'px')
    .style("left", ttleft + 'px');
};


module.exports = Tooltip;
