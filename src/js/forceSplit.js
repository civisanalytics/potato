//const d3 = require('./d3.v4.min.js');

// A variety of helper methods for using D3-Force to "split" the nodes
// by modifying their x/y coordinates
function ForceSplit() {
}

// TODO: has no tests, but maybe effectively covered by tests of `calculateLabelBounds()`?
// Dynamic labels that "float" above their current position
ForceSplit.prototype.updateAllLabelPositions = function(nodes, labels, axis) {
  if(labels === undefined || labels.length === 0) { return; }

  if(labels[0].type === "split") {
    labels.forEach(function(label) {
      var newPos = ForceSplit.prototype.calculateLabelBounds(nodes, label.split, label.val);
      label.tary = newPos.minY - 10;
      label.tarx = newPos.avgX;
    });
  } else if(labels[0].type === "order") {
    var newPos = ForceSplit.prototype.calculateLabelBounds(nodes);
    labels[0].tary = newPos.minY - 10;
    labels[0].tarx = newPos.minX;
    labels[1].tary = newPos.minY - 10;
    labels[1].tarx = newPos.maxX;

    axis.x1 = newPos.minX + 30;
    axis.x2 = newPos.maxX - 35;

    axis.y1 = newPos.minY - 8;
    axis.y2 = newPos.minY - 8;
  }
};

// split && value are optional, if specified, will only calculate bounds for nodes
// that are related to the given label
ForceSplit.prototype.calculateLabelBounds = function(nodes, split = undefined, value = undefined) {
  var minY, minX, maxX;

  // Iterate over current nodes, and make adjustments to label based on the node locations
  nodes.forEach(function(node) {

    // If label is specified, only check nodes related to this label
    // also, ignore nodes to the left of the view port aka "hidden"
    if((split === undefined || node[split] == value) && node.x > 0) {

      if(minY === undefined || ((node.y - node.radius) < minY)) {
        minY = node.y - node.radius;
      }
      if(minX === undefined || ((node.x - node.radius) < minX)) {
        minX = node.x - node.radius;
      }
      if(maxX === undefined || ((node.x + node.radius) > maxX)) {
        maxX = node.x + node.radius;
      }
    }
  });

  return {
    minY: minY,
    avgX: (maxX - minX) / 2.0 + minX,
    minX: minX,
    maxX: maxX
  };
};

// TODO: has no tests
// TODO: this arguably has enough d3 DOM manipulation to go in the main potato.js file?
// Will fade in new labels, the effect really only works if you reset the labels array each time
ForceSplit.prototype.updateLabels = function(labels, axis) {
  var text = d3.select("#vis-svg").selectAll(".split-labels")
      .data(labels);

  // update every tick
  text.enter().append("text")
      .attr("class", "split-labels")
      .text(function(d) { return d.text; })
    .merge(text)
      .attr("x", function(d) { return d.tarx; })
      .attr("y", function(d) { return d.tary; });

  text.exit().remove();

  var axisData = axis ? [axis] : [];

  var axis = d3.select("#vis-svg").selectAll(".axis-label")
    .data(axisData);

  axis.enter().append("line")
      .attr("stroke", "#999")
      .attr("class", "axis-label")
    .merge(axis)
      .attr("x1", function(d) { return d.x1; })
      .attr("x2", function(d) { return d.x2; })
      .attr("y1", function(d) { return d.y1; })
      .attr("y2", function(d) { return d.y2; });

  axis.exit().remove();
}

// TODO: Has no tests
ForceSplit.prototype.createSplitLabels = function(filter, splitLocations, uniqueValues, activeSizeBy) {
  var newLabels = [];

  // I think this may have only been needed if you want the "fade in" effect?
  //ForceSplit.prototype.updateLabels(newLabels);

  for(var label in splitLocations) {
    var labelVal = "";
    if (activeSizeBy != "") {
      labelVal = uniqueValues[filter].values[label].sums[activeSizeBy].toLocaleString();
    } else {
      labelVal = uniqueValues[filter].values[label].count.toLocaleString();
    }

    // also add a filter label
    newLabels.push({
      text: label + ": " + labelVal,
      val: label,
      split: filter,
      type: "split",
      tarx: splitLocations[label].x,
      tary: splitLocations[label].y
    });
  }

  return newLabels;
};

// Given an array of uniqueKeys (strings), return an array of x/y coord positions that form a grid
ForceSplit.prototype.calculateSplitLocations = function(uniqueKeys, width, height) {
  var numCols = Math.ceil(Math.sqrt(uniqueKeys.length));
  var numRows = Math.ceil(uniqueKeys.length / numCols);

  var padding = 0.8;

  // Some padding for when the circle groups get large, also to make room for color legend
  var paddedWidth = width * padding;
  var paddedHeight = height * padding;
  var leftPadding = (width - paddedWidth) / 2;
  var topPadding = (height - paddedHeight) / 2;

  var colSize = paddedWidth / (numCols + 1);
  var rowSize = paddedHeight / (numRows + 1);

  var splitLocations = {};

  // then for each category value, increment to give the "row/col" coordinate
  // maybe save this in an object where key == category and value = {row: X, col: Y}
  var currRow = 1;
  var currCol = 1;
  uniqueKeys.forEach(function(d) {
    splitLocations[d] = {
      x: currCol * colSize + leftPadding,
      y: currRow * rowSize + topPadding
    };

    currCol++;
    if (currCol > numCols) {
      currCol = 1;
      currRow++;
    }
  });

  return splitLocations;
};

module.exports = ForceSplit;
