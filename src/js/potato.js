const d3 = require('./d3.v4.min.js');
const DataParse = require('./dataParse.js');
const ForceSplit = require('./forceSplit.js');

// default behavior is empty string
// if string passed, will attempt to init split/color/size by filter passed
// if null passed, will hide the button
// TODO: passing in more than one causes the simulation to really lag on init
// also, passing both a color and size interrupts the size... not sure why?
var defaultParams = {
  split: "",
  color: "",
  size: "",
  //"class": null
};

function Potato(data, params) {
  if (params == null) {
    params = defaultParams;
  }

  // need to assign ids to everything for the subselection
  data.forEach(function (d, idx) {
    d.potatoID = idx;
  });

  this.resetToDefaultSize(data);

  this.originalData = JSON.parse(JSON.stringify(data));

  this.generateDOM();

  // Apply default forces to simulation
  this.simulation = d3.forceSimulation()
      .force("charge", this.getChargeForce())
      .force("x", this.centerXForce())
      .force("y", this.centerYForce());

  this.generateVis(data);

  this.generateFilterButtons(params);

  this.activeSizeBy = "";

  this.dragSelect();

  this.handleDefaultParams(params);
}

Potato.prototype.handleDefaultParams = function(params) {
  if(params.size != "") {
    this.sizeBy(params.size);
  }
  if(params.color != "") {
    this.colorBy(params.color);
  }
  if(params.split != "") {
    this.splitBy(params.split);
  }
}

Potato.prototype.getWidth = function() {
  return window.innerWidth;
}

Potato.prototype.getHeight = function() {
  return window.innerHeight - 55; // to make room for toolbar
}

Potato.prototype.centerXForce = function() {
  return d3.forceX(this.getWidth() / 2);
}

Potato.prototype.centerYForce = function() {
  return d3.forceY(this.getHeight() / 2);
}

// sets a few global variables
//  this.data
//  this.labels
//  this.uniqueValues
Potato.prototype.generateVis = function(data) {
  this.data = data;
  this.labels = [];

  this.uniqueValues = DataParse.prototype.enrichData(data);

  var that = this;

  var defaultFill = "#777";

  var node = d3.select("#vis-svg").selectAll("circle")
      .data(data, function(d) { return d.potatoID }); // IMPORTANT, make sure it tracks by our ID, and not just by index

  var mergedNodes = node.enter().append("circle")
      .attr("id", function(d) { return "node_" + d.potatoID; })
      .attr("fill", defaultFill)
      .attr("stroke", d3.rgb(defaultFill).darker()) // these are for the "hover border"
      .attr("stroke-width", 0) // hide border until hover is active
      .on("mouseover", function(d, i) {
        that.showDetails(d, i, this);
      }).on("mouseout", function(d, i) {
        that.hideDetails(d, i, this);
      })
    .merge(node)
      .attr("r", function(d) { return d.radius; });

  node.exit().remove();

  // Add the nodes to the simulation, and specify how to draw
  this.simulation.nodes(data)
      .on("tick.main", function() {
        // The d3 force simulation updates the x & y coordinates
        // of each node every tick/frame, based on the various active forces.
        // It is up to us to translate these coordinates to the screen.
        mergedNodes.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });

        ForceSplit.prototype.updateAllLabelPositions(that.data, that.labels, that.axis);
        that.updateLabels(that.labels);
      });
};

// xPointer,yPointer are current pointer location
// xOrigin,yOrigin are the coordinates of the original mouse down
Potato.prototype.calculateDragBox = function(xPointer, yPointer, xOrigin, yOrigin) {
  return {
    width: Math.abs(xOrigin - xPointer),
    height: Math.abs(yOrigin - yPointer),
    x: (xPointer < xOrigin) ? xPointer : xOrigin,
    y: (yPointer < yOrigin) ? yPointer : yOrigin,
  };
};

Potato.prototype.nodeInBox = function(nx, ny, bx, by, bx2, by2) {
  return !(nx < bx || nx > bx2 || ny < by || ny > by2);
};

Potato.prototype.dragSelect = function() {
  var that = this;

  d3.select("#vis-svg").on("mousedown", function() {
    d3.select(this).select("rect.select-box").remove();

    var p = d3.mouse(this);
    d3.select(this).append("rect")
      .attr("class", "select-box")
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("x", p[0])
      .attr("y", p[1])
      .attr("width", 0)
      .attr("height", 0)
      .attr("x0", p[0])
      .attr("y0", p[1]);

  }).on("mousemove", function() {
    var s = d3.select(this).select("rect.select-box");

    if (!s.empty()) {
      var p = d3.mouse(this);
      var x0 = parseInt(s.attr("x0"), 10);
      var y0 = parseInt(s.attr("y0"), 10);

      var d = Potato.prototype.calculateDragBox(p[0], p[1], x0, y0);

      s.attr("x", d.x)
       .attr("y", d.y)
       .attr("width", d.width)
       .attr("height", d.height);

      that.data.forEach(function(n) {
        if (Potato.prototype.nodeInBox(n.x, n.y, d.x, d.y, d.x + d.width, d.y + d.height)) {
          that.highlightNode(d3.select("#node_" + n.potatoID).node(), true);
        } else {
          that.highlightNode(d3.select("#node_" + n.potatoID).node(), false);
        }
      });
    }
  }).on("mouseup", function() {
    var s = d3.select("#vis-svg").select("rect.select-box");

    var sx = parseInt(s.attr('x'), 10);
    var sx2 = sx + parseInt(s.attr('width'), 10);
    var sy = parseInt(s.attr('y'), 10);
    var sy2 = sy + parseInt(s.attr('height'), 10);

    var newData = that.data.filter(function(c) {
      if (Potato.prototype.nodeInBox(c.x, c.y, sx, sy, sx2, sy2)) {
        that.highlightNode(d3.select("#node_" + c.potatoID).node(), false);
        return c;
      } else {
        return null;
      }
    });

    s.remove();

    // only subselect if at least one node was selected
    if (newData.length > 0 && newData.length !== that.data.length) {

      d3.select("#reset-button")
        .classed("disabled-button", false);

      that.generateVis(newData);
    }
  });
};

Potato.prototype.generateDOM = function() {
  d3.select("#vis")
    .html(`
      <div class='tooltip' id='node-tooltip' style='display:none;'></div>
      <div id='toolbar'>
        <div id='modifiers'></div>
        <div id='filter-select-buttons'></div>
      </div>
      <div id='color-legend'>
        <svg></svg>
      </div>
      <svg viewBox='0 0 ${this.getWidth()} ${this.getHeight()}' id='vis-svg'></svg>
    `);
}

Potato.prototype.generateFilterButtons = function(params) {
  // Only create buttons if param is not null
  for(var key in params) {
    if(key !== 'class' && params[key] != null) {
      this.createFilterButton(key);
    }
  }

  this.createResetButton();
};

Potato.prototype.getChargeForce = function() {
  return d3.forceManyBody().strength(function(d) {
    // base it on the radius of the node
    var multiplier = -0.2;
    return Math.pow((d.radius), 1.8) * multiplier;
  });
};

// Will fade in new labels, the effect really only works if you reset the labels array each time
Potato.prototype.updateLabels = function(labels) {
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

  var axisData = this.axis ? [this.axis] : [];

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

Potato.prototype.orderBy = function(filter) {

  var extent = DataParse.prototype.getNumericExtent(filter, this.data);

  var orderPadding = 160;

  // TODO: should we allow switching between linear and sqrt scale?
  var orders = d3.scaleLinear()
      .domain([extent.min, extent.max])
      .range([orderPadding, this.getWidth() - orderPadding]);

  // TODO: this should probably move to the reset function
  // wipe out the labels to get the fade in effect later
  this.labels = [];
  this.updateLabels(this.labels);

  // Tail
  this.labels.push({
    val: extent.min,
    text: extent.min,
    split: filter,
    type: "order",
    tarx: orders.range()[0],
    tary: this.getHeight() / 2.0 - 50
  });
  // Head
  this.labels.push({
    val: extent.max,
    text: extent.max,
    split: filter,
    type: "order",
    tarx: orders.range()[1],
    tary: this.getHeight() / 2.0 - 50
  });
  // axis
  this.axis = {
    x1: 220,
    x2: this.getWidth() - 160,
    y1: 0,
    y2: 0
  };

  var xForceFn = d3.forceX(function(d) {
    var currVal = parseFloat(d[filter])
    // if this row doesn't have this value, then fly off screen (to left)
    if(isNaN(currVal)) {
      return -100;
    }
    return orders(currVal);
  });

  this.simulation.force("x", xForceFn);
  this.simulation.force("y", this.centerYForce());

  this.simulation.alpha(1).restart();

  //TODO: Handle edge case with only one value
  /*if (filterMin === filterMax) {
    orders.range([this.getWidth() / 2.0, this.getWidth() / 2.0]);
  }*/
};

Potato.prototype.splitBy = function(filter, dataType) {
  // TODO: this probably needs to be... this.data[]?
  /*
  if (this.nodes === void 0 || this.nodes.length === 0) {
    return;
  }*/

  // TODO: is the only reason I'm doing this to get rid of the axis?...
  this.reset('split');

  // TODO: Change the hint on the button, seems like maybe this should go somewhere else?
  d3.select("#split-hint").html("<br>" + filter);

  // TODO: this isn't working properly b/c we're not turning this class of without a reset function
  d3.select("#split-" + filter).classed('active-filter', true);

  if (dataType === "num") {
    return this.orderBy(filter);
  } else {
    // first determine the unique values for this filter, also sort alpha
    var uniqueKeys = Object.keys(this.uniqueValues[filter].values).sort()

    var splitLocations = this.calculateSplitLocations(uniqueKeys);
    this.labels = this.createSplitLabels(filter, splitLocations);

    this.simulation.force("x", d3.forceX(function(d) {
      return splitLocations[d[filter]].x;
    }));
    this.simulation.force("y", d3.forceY(function(d) {
      return splitLocations[d[filter]].y;
    }));

    this.simulation.alpha(1).restart();
  }
};

Potato.prototype.createSplitLabels = function(filter, splitLocations) {
  var newLabels = [];
  this.updateLabels(newLabels);

  for(var label in splitLocations) {
    var labelVal = "";
    if (this.activeSizeBy != "") {
      labelVal = this.uniqueValues[filter].values[label].sums[this.activeSizeBy].toLocaleString();
    } else {
      labelVal = this.uniqueValues[filter].values[label].count.toLocaleString();
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
Potato.prototype.calculateSplitLocations = function(uniqueKeys) {
  var numCols = Math.ceil(Math.sqrt(uniqueKeys.length));
  var numRows = Math.ceil(uniqueKeys.length / numCols);

  var padding = 0.8;

  // Some padding for when the circle groups get large, also to make room for color legend
  var paddedWidth = this.getWidth() * padding;
  var paddedHeight = this.getHeight() * padding;
  var leftPadding = (this.getWidth() - paddedWidth) / 2;
  var topPadding = (this.getHeight() - paddedHeight) / 2;

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

Potato.prototype.sizeBy = function(filter, maxRadius=20) {
  this.activeSizeBy = filter;
  // TODO: if there are any labels, modify them to reflect the new sum

  /*
  if (this.nodes === void 0 || this.nodes.length === 0) {
    return;
  }*/
  //this.reset('size');
  d3.select("#size-hint").html("<br>" + filter);
  d3.select("#size-" + filter).classed('active-filter', true);

  var minRadius = 0.5;
  var extent = DataParse.prototype.getNumericExtent(filter, this.data);
  var minVal = minRadius * extent.max / maxRadius;

  // assume largest value =
  var sizeScale = d3.scaleSqrt()
      .domain([minVal, extent.max])
      .range([minRadius, maxRadius]);

  // any values less than minVal will get clamped to 1, effectively, tiny values will at least still be visible
  // my guess is the human eye cant tell the diff anyways?...
  sizeScale.clamp(true);

  // handle missing values gracefully by setting circle size to zero
  this.data.forEach(function(d) {
    var currSize = sizeScale(d[filter]);
    if (!isNaN(currSize) && currSize !== "" && currSize > 0) {
      d.radius = currSize;
    } else {
      d.radius = 0;
    }
  });

  this.applySize(this.data, this.simulation);

  var that = this;

  // TODO: the end result is really cool, but the effect
  // is a little choppy, is there a way to smooth this out?
  // Maybe temporarily turn off tick.main or something?
  // while this runs?...
  this.simulation.on('tick.size', function() {
    if(that.simulation.alpha() < 0.8) {
      that.adjustSize(that.data, filter, maxRadius);
    }
  });
};

// check all the nodes, if any are off the screen, then try resizing with a smaller
// maxRadius?
Potato.prototype.adjustSize = function(data, filter, maxRadius) {
  if(maxRadius > 5) {
    var nodeOutOfBounds = false;
    data.forEach(function(d) {
      var pad = 30; // 20 pixels of padding for any labels
      if(!Potato.prototype.nodeInBox(d.x, d.y, pad, pad, Potato.prototype.getWidth() - pad, Potato.prototype.getHeight() - pad)) {
        nodeOutOfBounds = true;
      }
    });

    if(nodeOutOfBounds) {
      this.sizeBy(filter, maxRadius - 1);
    }
  }
};

Potato.prototype.applySize = function(data, simulation) {
  // update the actual circle svg sizes
  d3.select("#vis-svg").selectAll("circle")
      .data(data)
      .transition()
      .attr("r", function(d) {
        return d.radius;
      });

  // Recalculate chargeForce to take into account new node sizes
  simulation.force("charge", this.getChargeForce())
  simulation.alpha(1).restart();
};

Potato.prototype.colorBy = function(filter, dataType) {
  /*if (this.nodes === void 0 || this.nodes.length === 0) {
    return;
  }*/
  //this.reset('color');

  d3.select("#color-hint").html("<br>" + filter);
  d3.select("#color-" + filter).classed('active-filter', true);


  // first determine the unique values for this category in the dataset, also sort alpha
  // historically it was ranked by number, but I think alpha may actually be better?
  // to keep female/asian/Argentina as one color no matter what the other splits are?
  var uniqueKeys = d3.map(this.data, function(d) {
    return d[filter];
  }).keys().sort();

  var numeric = dataType === 'num';

  var colorScale;
  // if numeric do gradient, else do categorical
  if(numeric === true) {
    var extent = DataParse.prototype.getNumericExtent(filter, this.data);

    colorScale = d3.scaleLinear()
        .domain([extent.min, extent.max])
        .range(["#ccc", "#1f77b4"]);
  } else {
    colorScale = d3.scaleOrdinal()
        .domain(uniqueKeys)
        .range(['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#bcbd22', '#17becf', '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5', '#c49c94', '#f7b6d2', '#dbdb8d', '#9edae5', '#777777']);
  }

  d3.select("#vis-svg").selectAll("circle")
      .data(this.data)
      .transition()
      .attr("fill", function(d) { return colorScale(d[filter]); } )
      .attr("stroke", function(d) { return d3.rgb(colorScale(d[filter])).darker(); }); // these are for the "hover border"

  // TODO: there used to be code to limit to 18 total colors, and then group the rest in "other"

  // Setup legend
  var legendDotSize = 30;
  var legendWrapper = d3.select("#color-legend").select("svg")
      .attr("width", 150)
      .attr("height", colorScale.domain().length * legendDotSize)
      .style("padding", "20px 0 0 20px");

  // The text of the legend
  var legendText = legendWrapper.selectAll("text")
      .data(colorScale.domain());

  uniqueValues = this.uniqueValues;

  legendText.enter().append("text")
      .attr("y", function(d, i) { return i * legendDotSize + 12; })
      .attr("x", 20)
    .merge(legendText)
      .text(function(d) {
        return d + ": " + uniqueValues[filter].values[d].count.toString();
      });

  legendText.exit().remove();

  // The dots of the legend
  var legendDot = legendWrapper.selectAll("rect")
      .data(colorScale.domain());

  legendDot.enter().append("rect")
      .attr("y", function(d, i) { return i * legendDotSize; })
      .attr("rx", legendDotSize * 0.5)
      .attr("ry", legendDotSize * 0.5)
      .attr("width", legendDotSize * 0.5)
      .attr("height", legendDotSize * 0.5)
    .merge(legendDot)
      .style("fill", function(d) { return colorScale(d); });

  legendDot.exit().remove();
};

Potato.prototype.applyFilter = function(type, filter, dataType) {
  if (type === "split") {
    this.splitBy(filter, dataType);
  }
  if (type === "color") {
    this.colorBy(filter, dataType);
  }
  if (type === "size") {
    return this.sizeBy(filter);
  }
};

Potato.prototype.resetToDefaultSize = function(data) {
  data.forEach(function(d) {
    d.radius = 2;
  });
};

Potato.prototype.resetSubselection = function() {
  d3.select("#reset-button")
    .classed("disabled-button", true);

  var newData = JSON.parse(JSON.stringify(this.originalData));
  this.generateVis(newData);
};

Potato.prototype.reset = function(type) {
  // Clear the button hints
  d3.select("." + type + "-option").classed('active-filter', false);
  d3.select("#" + type + "-hint").html("");

  if (type === 'color') {
    d3.select("#color-legend").select("svg").selectAll("*").remove();

    d3.select("#vis-svg").selectAll("circle")
        .data(this.data)
        .transition()
        .attr("fill", "#777");
  } else if (type === 'size') {
    this.resetToDefaultSize(this.data);

    this.applySize(this.data, this.simulation);
  } else if (type === 'split' || type === 'order') {
    this.labels = [];
    this.axis = undefined;
    this.updateLabels(this.labels);

    this.simulation.force("x", this.centerXForce());
    this.simulation.force("y", this.centerYForce());

    this.simulation.alpha(1).restart();
  }
};

Potato.prototype.createFilterButton = function(type) {
  var typeUpper = type[0].toUpperCase() + type.slice(1);

  d3.select("#modifiers")
    .append("div")
    .attr("id", type + "-wrapper")
    .attr("class", "modifier-wrapper")
    .on("mouseleave", function(d) {
      d3.select("#" + type + "-menu")
        .style("display", "none")
    }).html(`
      <button id='${type}-button' class='modifier-button'>
        ${typeUpper}
        <span class='button-arrow'>&#x25BC;</span>
        <span id='${type}-hint' class='modifier-hint'></span>
      </button>
      <div id='${type}-menu' class='modifier-menu'></div>
    `);

  d3.select(`#${type}-button`)
    .on("mouseover", function(d) {
      d3.select("#" + type + "-menu")
        .style("display", "block")
    })
    .on("click", (function(_this) {
      return function(d) {
        return _this.reset(type);
      };
    })(this));

  var filters = DataParse.prototype.calculateFilters(this.uniqueValues);

  var buttonFilters = filters.numeric.map(function(f) {
    return {
      value: f,
      type: 'num'
    };
  });
  if (type === "color" || type === "split") {
    buttonFilters = buttonFilters.concat({
      value: '',
      type: 'divider'
    }).concat(filters.categorical.map(function(f) {
      return {
        value: f,
        type: 'cat'
      };
    }));
  }

  d3.select("#" + type + "-menu")
    .selectAll('div')
    .data(buttonFilters)
    .enter().append("div")
    .text(function(d) {
      return d.value;
    }).attr("class", function(d) {
      if (d.type === 'divider') {
        return 'divider-option';
      } else {
        return "modifier-option " + type + "-option";
      }
    }).attr("id", function(d) {
      return type + "-" + d.value;
    }).on("click", (function(_this) {
      return function(d) {
        return _this.applyFilter(type, d.value, d.type);
      };
    })(this));
};

Potato.prototype.createResetButton = function() {
  var that = this;

  d3.select("#filter-select-buttons").append("button")
    .attr("id", "reset-button")
    .attr("class", "disabled-button modifier-button")
    .html(`
      <span id='reset-icon'>&#8635;</span> Reset Selection
      <div class='tooltip' id='reset-tooltip' style='display: none;'>
        Click and drag on the canvas to select nodes.
      </div>
    `)
    .on("click", function(d) {
      that.resetSubselection();
    }).on("mouseover", function(d) {
      d3.select("reset-tooltip")
        .style("display", "block");
    }).on("mouseleave", function(d) {
      d3.select("reset-tooltip")
        .style("display", "none");
    });
};

Potato.prototype.showDetails = function(data, i, element) {
  var content = Object.keys(this.uniqueValues).map(function(key) {
    return key + ": " + data[key];
  }).join("<br/>");

  d3.select("#node-tooltip").html(content).style("display", "block");
  this.updateTooltipPosition(d3.event, "node-tooltip");
  this.highlightNode(element, true);
};

Potato.prototype.hideDetails = function(data, i, element) {
  d3.select("#node-tooltip").style("display", "none");

  this.highlightNode(element, false);
};

Potato.prototype.highlightNode = function(elementID, highlight) {
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

Potato.prototype.updateTooltipPosition = function(e, id) {
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

module.exports = Potato;
window.Potato = Potato; // Hmmmm is this a bad idea?...
