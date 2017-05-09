//const d3 = require('./d3.v4.min.js');

function ForceSplit() {
}

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

module.exports = ForceSplit;
