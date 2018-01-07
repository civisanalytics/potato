//const d3 = require('./d3.v4.min.js');

// A variety of helper methods for sizing the nodes
function NodeSize() {
}


/*
  All nodes are within the inner box
  - nodeOutOfBounds === false
  - nodeInMargin === false
 increase radius to fit
   ______
  |  __  |
  | |* | |
  | | *| |
  | |__| |
  |______|


  At least one node is outside outer box
  - nodeOutOfBounds === true
  - nodeInMargin === false || true
  decrease radius to fit
   ______              ______              ______
  |  __  | *          |  __  | *          |  __  | *
  | |  | |            | |* | |            | |  | |
  | | *| |     OR     | |  |*|     OR     | |  |*|
  | |__| |            | |__| |            | |__| |
  |______|            |______|            |______|


  All nodes are inside outer box AND at least one node is in the margin
  - nodeOutOfBounds === false
  - nodeInMargin === true
  do nothing
   ______              ______
  |  __ *|            |  __ *|
  | |  | |            | |  | |
  | | *| |     OR     | |  |*|
  | |__| |            | |__| |
  |______|            |______|
*/

// returns an integer of the newRadius
NodeSize.prototype.adjustSize = function(data, maxRadius, width, height) {
  if(maxRadius > 5) {
    // where bounds is defined as 30 pixels inside or less, as well as outside the box
    var nodeOutOfBounds = false;
    var outerPadding = 30;

    // is there a node between the inner and outer paddings
    var nodeInMargin = false;
    var innerPadding = 50;

    data.forEach(function(d) {
      if(!NodeSize.prototype.nodeInBox(d.x, d.y, innerPadding, innerPadding, width - innerPadding, height - innerPadding)) {
        if(!NodeSize.prototype.nodeInBox(d.x, d.y, outerPadding, outerPadding, width - outerPadding, height - outerPadding)) {
          nodeOutOfBounds = true;
        } else {
          nodeInMargin = true;
        }
      }
    });

    if(nodeOutOfBounds) {
      return maxRadius - 1;
    } else if(nodeInMargin) {
      return maxRadius; // nodes in sweet spot, so do nothing
    } else {
      return maxRadius + 1;
    }
  }
};


NodeSize.prototype.nodeInBox = function(nx, ny, bx, by, bx2, by2) {
  return !(nx < bx || nx > bx2 || ny < by || ny > by2);
};

NodeSize.prototype.resetToDefaultSize = function(data) {
  data.forEach(function(d) {
    d.radius = 2;
  });
};


module.exports = NodeSize;
