const d3 = require('./d3.v4.min.js');

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

  this.data = data;
  this.uniqueValues = this.uniqueDataValues(data);
  this.uniqueValues = this.enrichData(data, this.uniqueValues);

  this.width = window.innerWidth;
  this.height = window.innerHeight - 55;

  this.svg = this.createSVG(this.width, this.height);

  // Only create buttons if param is set to True
  for(var key in params) {
    if(key !== 'class' && params[key] != null) {
      this.createButtons(key);
    }
  }

  this.createResetButton();

  this.resetToDefaultSize(data);

  this.labels = [];

  // "Electric repulsive charge", prevents overlap of nodes
  var chargeForce = this.getChargeForce();

  // Keep nodes centered on screen
  this.centerXForce = d3.forceX(this.width / 2);
  this.centerYForce = d3.forceY(this.height / 2);

  // TODO: might be interesting to set the strengths on the x and y higher
  // and also raise the force of the chargeForce.  This might cause the groups to not
  // affect each other as much?...

  // Apply default forces to simulation
  this.simulation = d3.forceSimulation()
      .force("charge", chargeForce)
      .force("x", this.centerXForce)
      .force("y", this.centerYForce);

  var that = this;

  var node = this.svg.selectAll("circle")
      .data(data)
      .enter().append("circle")
      .attr("r", function(d) {
        return d.radius;
      })
      .attr("fill", "#777")
      .on("mouseover", function(d, i) {
        that.showDetails(d, i, this);
      }).on("mouseout", function(d, i) {
        that.hideDetails(d, i, this);
      });

  this.activeSizeBy = "";

  if(params.size != "") {
    this.sizeBy(params.size);
  }
  if(params.color != "") {
    this.colorBy(params.color);
  }
  if(params.split != "") {
    this.splitBy(params.split);
  }

  // Add the nodes to the simulation, and specify how to draw
  this.simulation.nodes(data)
      .on("tick", function() {
        // The d3 force simulation updates the x & y coordinates
        // of each node every tick/frame, based on the various active forces.
        // It is up to us to translate these coordinates to the screen.
        node.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });

        that.updateAllLabelPositions(that.labels, that.data);
        that.updateLabels(that.svg, that.labels);
      });
}

Potato.prototype.createSVG = function(width, height) {
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
      <svg viewBox='0 0 ${width} ${height}' id='vis-svg'></svg>
    `);

  return d3.select("#vis-svg");
};

Potato.prototype.getChargeForce = function() {
  return d3.forceManyBody().strength(function(d) {
    // base it on the radius of the node
    var multiplier = -0.2;
    return Math.pow((d.radius), 1.8) * multiplier;
  });
};

// Dynamic labels that "float" above their current position
Potato.prototype.updateAllLabelPositions = function(labels, nodes) {
  if(labels == undefined) { return; }

  labels.forEach(function(label) {
    var newPos = Potato.prototype.updateLabelPosition(label, nodes);
    label.tary = newPos.tary;
    label.tarx = newPos.tarx;
  });
};

Potato.prototype.updateLabelPosition = function(label, nodes) {
  var minY, minX, maxX;

  // Iterate over current nodes, and make adjustments to label based on the node locations
  nodes.forEach(function(node) {

    // Only take into account nodes related to this label
    if(node[label.split] == label.val) {
      if(minY === undefined || ((node.y - node.radius) < minY)) {
        minY = node.y - node.radius;
      }

      // Categorical labels may need to adjust x location too
      if(label.type == "split") {
        if(minX === undefined || ((node.x - node.radius) < minX)) {
          minX = node.x - node.radius;
        }
        if(maxX === undefined || ((node.x + node.radius) > maxX)) {
          maxX = node.x + node.radius;
        }
      }
    }
  });

  return {
    tary: minY - 10, // little bit of offset so label is above nodes
    tarx: (maxX - minX) / 2.0 + minX
  };
};

// Will fade in new labels, the effect really only works if you reset the labels array each time
Potato.prototype.updateLabels = function(svg, labels) {
  var text = svg.selectAll(".split-labels")
      .data(labels);

  // update every tick
  text.enter().append("text")
      .attr("class", "split-labels")
      .text(function(d) { return d.text; })
    .merge(text)
      .attr("x", function(d) { return d.tarx; })
      .attr("y", function(d) { return d.tary; });

  text.exit().remove();
}

Potato.prototype.orderBy = function(filter) {

  var extent = this.getNumericExtent(filter, this.data);

  var orderPadding = 160;

  // TODO: should we allow switching between linear and sqrt scale?
  var orders = d3.scaleLinear()
      .domain([extent.min, extent.max])
      .range([orderPadding, this.width - orderPadding]);

  // TODO: this should probably move to the reset function
  // wipe out the labels to get the fade in effect later
  this.labels = [];
  // TODO: add the line thing between the labels?
  this.updateLabels(this.svg, this.labels);

  // Tail
  this.labels.push({
    val: extent.min,
    text: extent.min,
    split: filter,
    type: "order",
    tarx: orders.range()[0],
    tary: this.height / 2.0 - 50
  });
  // Head
  this.labels.push({
    val: extent.max,
    text: extent.max,
    split: filter,
    type: "order",
    tarx: orders.range()[1],
    tary: this.height / 2.0 - 50
  });

  var xForceFn = d3.forceX(function(d) {
    var newX = orders(parseFloat(d[filter]))
    // if this row doesn't have this value, then fly off screen (to left)
    if(isNaN(parseFloat(d[filter]))) {
      return -100;
    }
    return newX;
  });

  var yForceFn = d3.forceY(this.height / 2.0);
  this.simulation.force("x", xForceFn);
  this.simulation.force("y", yForceFn);

  this.simulation.alpha(1).restart();

  //TODO: Handle edge case with only one value
  /*if (filterMin === filterMax) {
    orders.range([this.width / 2.0, this.width / 2.0]);
  }*/
};

Potato.prototype.splitBy = function(filter, dataType) {
  // TODO: this probably needs to be... this.data[]?
  /*
  if (this.nodes === void 0 || this.nodes.length === 0) {
    return;
  }*/

  // TODO: fix this
  //this.reset('split');

  // TODO: Change the hint on the button, seems like maybe this should go somewhere else?
  d3.select("#split-hint").html("<br>" + filter);

  // TODO: this isn't working properly b/c we're not turning this class of without a reset function
  d3.select("#split-" + filter).classed('active-filter', true);

  if (dataType === "num") {
    // TODO: implement orderBy
    return this.orderBy(filter);
  } else {
    // first determine the unique values for this filter, also sort alpha
    var uniqueKeys = Object.keys(this.uniqueValues[filter].values).sort()

    var splitLocations = this.calculateSplitLocations(uniqueKeys, this.width, this.height);
    this.labels = this.createSplitLabels(filter, splitLocations);

    var xForceFn = d3.forceX(function(d) {
      return splitLocations[d[filter]].x;
    });

    var yForceFn = d3.forceY(function(d) {
      return splitLocations[d[filter]].y;
    });
    this.simulation.force("x", xForceFn);
    this.simulation.force("y", yForceFn);

    this.simulation.alpha(1).restart();
  }
};

Potato.prototype.createSplitLabels = function(filter, splitLocations) {
  var newLabels = [];
  this.updateLabels(this.svg, newLabels);

  for(var label in splitLocations) {
    var labelVal = "";
    if (this.activeSizeBy != "") {
      labelVal = this.uniqueValues[filter].values[label].sums[this.activeSizeBy].toLocaleString();
    } else {
      labelVal = this.uniqueValues[filter].values[label].count.toLocaleString();
    }
    var labelText = label + ": " + labelVal;

    // also add a filter label
    newLabels.push({
      text: labelText,
      val: label,
      split: filter,
      type: "split",
      tarx: splitLocations[label].x,
      tary: splitLocations[label].y
    });
  }

  return newLabels
};

// Given an array of uniqueKeys (strings), return an array of x/y coord positions that form a grid
Potato.prototype.calculateSplitLocations = function(uniqueKeys, width, height) {
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

Potato.prototype.sizeBy = function(filter) {
  this.activeSizeBy = filter;
  // TODO: if there are any labels, modify them to reflect the new sum

  /*
  if (this.nodes === void 0 || this.nodes.length === 0) {
    return;
  }*/
  //this.reset('size');
  d3.select("#size-hint").html("<br>" + filter);
  d3.select("#size-" + filter).classed('active-filter', true);

  var maxRadius = 20;
  var minRadius = 0.5;
  var extent = this.getNumericExtent(filter, this.data);
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

  this.applySize(this.svg, this.data, this.simulation);
};

Potato.prototype.applySize = function(svg, data, simulation) {
  // update the actual circle svg sizes
  svg.selectAll("circle")
      .data(data)
      .transition()
      .attr("r", function(d) {
        return d.radius;
      });

  // Reclaculate chargeForce to take into account new node sizes
  var chargeForce = this.getChargeForce();
  simulation.force("charge", chargeForce)
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
    var extent = this.getNumericExtent(filter, this.data);

    colorScale = d3.scaleLinear()
        .domain([extent.min, extent.max])
        .range(["#ccc", "#1f77b4"]);
  } else {
    colorScale = d3.scaleOrdinal()
        .domain(uniqueKeys)
        .range(['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#bcbd22', '#17becf', '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5', '#c49c94', '#f7b6d2', '#dbdb8d', '#9edae5', '#777777']);
  }

  this.svg.selectAll("circle")
      .data(this.data)
      .transition()
      .attr("fill", function(d) { return colorScale(d[filter]); } );

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

Potato.prototype.reset = function(type) {
  // Clear the button hints
  d3.select("." + type + "-option").classed('active-filter', false);
  d3.select("#" + type + "-hint").html("");

  if (type === 'color') {
    d3.select("#color-legend").select("svg").selectAll("*").remove();

    this.svg.selectAll("circle")
        .data(this.data)
        .transition()
        .attr("fill", "#777");
  } else if (type === 'size') {
    this.resetToDefaultSize(this.data);

    this.applySize(this.svg, this.data, this.simulation);
  } else if (type === 'split' || type === 'order') {
    /*while (this.axis.length > 0) {
      this.axis.pop();
    }*/
    this.labels = [];
    this.updateLabels(this.svg, this.labels);

    this.simulation.force("x", this.centerXForce);
    this.simulation.force("y", this.centerYForce);

    this.simulation.alpha(1).restart();
  }
};

Potato.prototype.createButtons = function(type) {
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

  var filters = this.calculateFilters(this.uniqueValues);

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
  return d3.select("#" + type + "-menu").selectAll('div').data(buttonFilters).enter().append("div").text(function(d) {
    return d.value;
  }).attr("class", function(d) {
    if (d.type === 'divider') {
      return 'divider-option';
    } else {
      return "modifier-option " + type + "-option";
    }
  }).attr("data-type", function(d) {
    return "" + d.type;
  }).attr("id", function(d) {
    return type + "-" + d.value;
  }).on("click", (function(_this) {
    return function(d) {
      return _this.applyFilter(type, d.value, d.type);
    };
  })(this));
};

Potato.prototype.createResetButton = function() {
  d3.select("#filter-select-buttons").append("button")
    .attr("id", "reset-button")
    .attr("class", "disabled-button modifier-button")
    .html(`
      <span id='reset-icon'>&#8635;</span> Reset Selection
      <div class='tooltip' id='reset-tooltip'>
        Click and drag on the canvas to select nodes.
      </div>
    `)
    .on("click", function(d) {
      //this.add_all();
    }).on("mouseover", function(d) {
      d3.select("reset-tooltip")
        .style("display", "block");
    }).on("mouseleave", function(d) {
      d3.select("reset-tooltip")
        .style("display", "hide");
    });
};

Potato.prototype.showDetails = function(data, i, element) {
  var content = "";

  Object.keys(this.uniqueValues).forEach(function(key) {
    content += key + ": " + data[key] + "<br/>";
  });
  d3.select("#node-tooltip").html(content).style("display", "block");
  this.updatePosition(d3.event, "node-tooltip");
//      this.highlightNode(d3.select(element), true);
};

Potato.prototype.hideDetails = function(data, i, element) {
  d3.select("#node-tooltip").style("display", "none");

//      this.highlightNode(d3.select(element), false);
};

// TODO: This is broken b/c new d3v4 doesnt have selection
Potato.prototype.highlightNode = function(element, highlight) {
  // ignore custom colors
  if (element.attr("class") !== undefined) {
    var sWidth;
    if (highlight) {
      sWidth = element.attr("r") * 0.3;
    } else {
      sWidth = 0;
    }
    element.attr("stroke-width", sWidth);
    /*
    element.attr("r", function(d) {
        return d.radius + (sWidth / 2.0);
      }).attr("stroke-width", sWidth);*/
  }
};

Potato.prototype.updatePosition = function(e, id) {
  var xOffset = 20;
  var yOffset = 10;
  var rect = d3.select("#" + id).node().getBoundingClientRect();
  var ttw = rect.width;
  var tth = rect.height;
  var ttleft = (e.pageX + xOffset * 2 + ttw) > window.innerWidth ? e.pageX - ttw - xOffset * 2 : e.pageX + xOffset;
  var tttop = (e.pageY + yOffset * 2 + tth) > window.innerHeight ? e.pageY - tth - yOffset * 2 : e.pageY + yOffset;

  d3.select("#" + id)
    .style("top", tttop + 'px')
    .style("left", ttleft + 'px');
};



//////////////////
//
// THESE HAVE TEST COVERAGE YAY!
//


// given data, and uniqueValues, enrich uniqueValues with sums/means/counts
Potato.prototype.enrichData = function(data, uniqueValues) {
  var filters = this.calculateFilters(uniqueValues);

  data.forEach(function(row) {

    filters.categorical.forEach(function(catFilter) {
      var val = row[catFilter];

      var subVal = uniqueValues[catFilter].values[val];

      if(!("sums" in subVal)) {
        subVal.sums = {};
      }

      // cumultative sum each of the numeric coluns
      filters.numeric.forEach(function(numFilter) {
        var newVal = parseFloat(row[numFilter]);
        if(!isNaN(newVal)) {
          if(!(numFilter in subVal.sums)) {
            subVal.sums[numFilter] = newVal;
          } else {
            subVal.sums[numFilter] += newVal;
          }
        }
      });
    });
  });

  // finally, iterate over categorical filters and calculate averages
  for(var key in uniqueValues) {
    if(uniqueValues[key].type == "cat") {
      var values = uniqueValues[key].values;

      for(var key2 in values) {
        values[key2].means = {};

        filters.numeric.forEach(function(numFilter) {
          values[key2].means[numFilter] = values[key2].sums[numFilter] / values[key2].count;
        });
      }
    }
  }

  return uniqueValues;
};

// Two arrays of the numeric and categorical filters
Potato.prototype.calculateFilters = function(uniqueValues) {
  var categoricalFilters = [];
  var numericFilters = [];

  for(var key in uniqueValues) {
    if(uniqueValues[key].type == "num") {
      numericFilters.push(key);
    } else {
      categoricalFilters.push(key);
    }
  }

  return {
    categorical: categoricalFilters,
    numeric: numericFilters
  };
};

// Given an array of data (d3 format)
// return an object containing all the filters/columns and all unique values
// as well as some type metadata
// eg:
//
// filterFoo: {
//   numValues: 7
//   type: "num"
//   values: {
//     valueBar: {
//       filter: "filterFoo",
//       value: "valueBar"
//     },
//     ... // 6 more objects
//   }
// }
Potato.prototype.uniqueDataValues = function(data) {
  var uniqueValues = {};

  data.forEach(function(row) {
    for(var key in row) {
      var val = row[key];

      // this is a new filter we haven't seen before, so add
      if(!uniqueValues.hasOwnProperty(key)) {
        uniqueValues[key] = {
          values: {},
          numValues: 0,
          type: "num" // "num", "cat", "unique"
        };
      }

      // If we ever encounter a non-numeric, than assume categorical
      if(uniqueValues[key].type == "num" && val !== "") {
        var isCategorical = isNaN(val.replace(/%/,"").replace(/,/g,""));

        if(isCategorical) {
          uniqueValues[key].type = "cat";
        }
      }

      // new value that we should add
      if(!(val in uniqueValues[key].values)) {
        uniqueValues[key].numValues += 1;
        uniqueValues[key].values[val] = {
          filter: key,
          value: val,
          count: 1,
        };
      } else {
        uniqueValues[key].values[val].count += 1;
      }
    }
  });

  // If it's categorical AND there are more than 100 diff values or every value is unique
  // it's probably not usefully categorical any more.
  for(var key in uniqueValues) {
    var val = uniqueValues[key];
    if(val.type === "cat" && (val.numValues > 100 || val.numValues === data.length)) {
      val.type = "unique";
    }
  }
  return uniqueValues;
};

Potato.prototype.parseNumericString = function(str) {
  return parseFloat(str.replace(/%/, "").replace(/,/g, ""));
};

// For a given filter, get the extent (min and max)
// it's a bit fancier than d3.extent as it ignores NaNs and also does
// string parsing of "numerics"
Potato.prototype.getNumericExtent = function(filter, data) {
  var filterMax = 0;
  var filterMin = null;

  data.forEach(function(row) {
    var currVal = Potato.prototype.parseNumericString(row[filter]);
    // ignore emptys (NaN)
    if(!isNaN(currVal)) {
      if(currVal > filterMax) {
        filterMax = currVal;
      }
      if(filterMin === null || currVal < filterMin) {
        filterMin = currVal;
      }
    }
  });

  return { min: filterMin, max: filterMax };
};

module.exports = Potato;
window.Potato = Potato; // Hmmmm is this a bad idea?...