(function() {
  var root,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  window.Potato = (function() {
    // if true, then interactive, if false, button is hidden
    var defaultParams = {
      split: true,
      color: true,
      size: true,
      "class": null
    };

    function Potato(data, params) {
      if (params == null) {
        params = defaultParams;
      }

      this.data = data;
      this.calculateFilters();

      this.labels = [];

      $("#vis").append("<div class='tooltip' id='node-tooltip'></div>")
               .append("<div id='toolbar'><div id='modifiers'></div><div id='filter-select-buttons'></div></div>");
      $("#node-tooltip").hide();

      this.width = $(window).width();
      this.height = $(window).height() - 55;
      this.svg = d3.select("#vis").append("svg").attr("viewBox", "0 0 " + this.width + " " + this.height).attr("id", "vis-svg");

      // Only create buttons if param is set to True
      for(var key in params) {
        if(key !== 'class' && params[key] === true) {
          this.createButtons(key);
        }
      }

      // for now arbitrarily start all nodes at radius of 5
      data.forEach(function(d) {
        d.radius = 5;
      });

      // "Electric repulsive charge", prevents overlap of nodes
      var chargeForce = d3.forceManyBody().strength(function(d) {
        // base it on the radius of the node
        return -Math.pow(d.radius, 2.0) * 0.2;
      });

      // Keep nodes centered on screen
      var centerXForce = d3.forceX(this.width / 2);
      var centerYForce = d3.forceY(this.height / 2);

      // Apply default forces to simulation
      this.simulation = d3.forceSimulation()
          .force("charge", chargeForce)
          .force("x", centerXForce)
          .force("y", centerYForce);

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

      // Add the nodes to the simulation, and specify how to draw
      this.simulation.nodes(data)
          .on("tick", function() {
            // The d3 force simulation updates the x & y coordinates
            // of each node every tick/frame, based on the various active forces.
            // It is up to us to translate these coordinates to the screen.
            node.attr("cx", function(d) { return d.x; })
                .attr("cy", function(d) { return d.y; });

            // TODO: hmmmm so one option is to update labels here, and not actually attach them to the physics simulation

          });
    }

    // Update any labels on the screen as needed, called by orderBy and splitBy
    Potato.prototype.updateLabels = function() {
      var text = this.svg.selectAll(".split-labels")
          .data(this.labels)

      text.enter().append("text")
        .merge(text)
          .attr("class", "split-labels")
          .text(function(d) { return d.val; })
          .attr("x", function(d) { return d.tarx; })
          .attr("y", function(d) { return d.tary; });

      text.exit().remove();
    }

    Potato.prototype.orderBy = function(filter) {

      var extent = this.getNumericExtent(filter);

      var orderPadding = 160;

      // TODO: should we allow switching between linear and sqrt scale?
      var orders = d3.scaleLinear()
          .domain([extent.min, extent.max])
          .range([orderPadding, this.width - orderPadding]);

      // TODO: this should probably move to the reset function
      this.labels = [];

      // Tail
      this.labels.push({
        val: extent.min,
        split: filter,
        tarx: orders.range()[0],
        tary: this.height / 2.0 - 50 // TODO: either make this relative to the number of nodes, or do the fancy thing in the old version
      });
      // Head
      this.labels.push({
        val: extent.max,
        split: filter,
        tarx: orders.range()[1],
        tary: this.height / 2.0 - 50 // TODO: either make this relative to the number of nodes, or do the fancy thing in the old version
      });

      // TODO: add the line thing between the labels?
      this.updateLabels();

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
      // TODO: labels
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
      $("#split-hint").html("<br>" + filter);
      $("#split-" + filter).addClass('active-filter');

      if (dataType === "num") {
        // TODO: implement orderBy
        return this.orderBy(filter);
      } else {
        // first determine the unique values for this category in the dataset, also sort
        var uniqueKeys = d3.map(this.data, function(d) {
          return d[filter];
        }).keys().sort();

        // then determine what spots all the values should go to
        var numCols = Math.ceil(Math.sqrt(uniqueKeys.length));
        var numRows = Math.ceil(uniqueKeys.length / numCols);
        var currRow = 0;
        var currCol = 0;

        // padding because the clumps tend to float off the screen
        var paddedWidth = this.width * 0.8;
        var paddedHeight = this.height * 0.8;

        var keysToLocation = {};

        // TODO: this should probably move to the reset function
        this.labels = [];

        // then for each category value, increment to give the "row/col" coordinate
        // maybe save this in an object where key == category and value = {row: X, col: Y}
        uniqueKeys.forEach((function(_this) {
          return function(d) {
            var finalObj = {
              x: (_this.width * 0.12) + (0.5 + currCol) * (paddedWidth / numCols),
              y: (_this.height * 0.10) + (0.5 + currRow) * (paddedHeight / numRows)
            };

            currCol++;
            if (currCol >= numCols) {
              currCol = 0;
              currRow++;
            }

            keysToLocation[d] = finalObj;

            // also add a filter label
            _this.labels.push({
              val: d,
              split: filter,
              tarx: finalObj.x,
              tary: finalObj.y - 50 // TODO: either make this relative to the number of nodes, or do the fancy thing in the old version
            });
          };
        })(this));

        this.updateLabels();

        var xForceFn = d3.forceX(function(d) {
          return keysToLocation[d[filter]].x;
        });

        var yForceFn = d3.forceY(function(d) {
          return keysToLocation[d[filter]].y;
        });
        this.simulation.force("x", xForceFn);
        this.simulation.force("y", yForceFn);

        this.simulation.alpha(1).restart();
      }
    };

    Potato.prototype.sizeBy = function(filter) {
      /*
      if (this.nodes === void 0 || this.nodes.length === 0) {
        return;
      }*/
      //this.reset('size');
      $("#size-hint").html("<br>" + filter);
      $("#size-" + filter).addClass('active-filter');

      var extent = this.getNumericExtent(filter);

      var sizeScale = d3.scaleSqrt()
          .domain([extent.min, extent.max])
          .range([3, 12]);

      // handle missing values gracefully by setting circle size to zero
      this.data.forEach(function(d) {
        var currSize = sizeScale(d[filter]);
        if (!isNaN(currSize) && currSize !== "" && currSize > 0) {
          d.radius = currSize;
        } else {
          d.radius = 0;
        }
      });

      // update the actual circle svg sizes
      this.svg.selectAll("circle")
          .data(this.data)
          .transition()
          .attr("r", function(d) {
            return d.radius;
          });

      // but also update the simulation

      var chargeForce = d3.forceManyBody().strength(function(d) {
        // base it on the radius of the node
        return -Math.pow(d.radius, 2.0) * 0.2;
      });

      // change chargeForce to take into account new node sizes
      this.simulation.force("charge", chargeForce)
      this.simulation.alpha(1).restart();
    };

    Potato.prototype.colorBy = function(filter, dataType) {
      /*if (this.nodes === void 0 || this.nodes.length === 0) {
        return;
      }*/
      //this.reset('color');

      // hmmmm we should probably just do this at init?
      if ($("#color-legend").length < 1) {
        $("#vis").append("<div id='color-legend'></div>")
        $("#color-legend").append("<svg></svg>");
      }
      $("#color-hint").html("<br>" + filter);
      $("#color-" + filter).addClass('active-filter');

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
        var extent = this.getNumericExtent(filter);

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

      legendText.enter().append("text")
          .attr("y", function(d, i) { return i * legendDotSize + 12; })
          .attr("x", 20)
        .merge(legendText)
          .text(function(d) { return d; });

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

    Potato.prototype.applyFilters = function() {
      return $(".active-filter").each((function(_this) {
        return function(i, filterObj) {
          var filterId = $(filterObj).attr('id');
          var dashLoc = filterId.indexOf('-');
          var type = filterId.substr(0, dashLoc);
          var val = filterId.substr(dashLoc + 1);
          return _this.applyFilter(type, val, $(filterObj).attr('data-type'));
        };
      })(this));
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

    Potato.prototype.createButtons = function(type) {
      var typeUpper = type[0].toUpperCase() + type.slice(1);
      $("#modifiers").append("<div id='" + type + "-wrapper' class='modifier-wrapper'><button id='" + type + "-button' class='modifier-button'>" + typeUpper + "<span class='button-arrow'>&#x25BC;</span><span id='" + type + "-hint' class='modifier-hint'></span></button><div id='" + type + "-menu' class='modifier-menu'></div></div>");
      $("#" + type + "-button").hover(function() {
        return $("#" + type + "-menu").slideDown(100);
      });
      $("#" + type + "-wrapper").mouseleave(function() {
        return $("#" + type + "-menu").slideUp(100);
      });
      $("#" + type + "-button").on("click", (function(_this) {
        return function() {
          return _this.reset(type);
        };
      })(this));
      var buttonFilters = this.numericFilters;
      if (type === "color" || type === "split") {
        buttonFilters = buttonFilters.concat({
          value: '',
          type: 'divider'
        }).concat(this.categoricalFilters);
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

    // Given an array of data (d3 format)
    // return an object containing all the filters/columns and all unique values
    // - key is the filter type and the value is an array of filters
    Potato.prototype.uniqueDataValues = function(data) {
      var uniqueValues = {};

      for(var i=0; i<data.length; i++) {
        for(var key in data[i]) {
          var val = data[i][key];

          // TODO: Do we even need the nodeId anymore? (might need it for subselection?)
          // ignore the id
          if (key !== 'node_id') {
            var keyMod = key.replace(/\(|\)/g, " ");

            // this is a new filter we haven't seen before, so add
            if(!uniqueValues.hasOwnProperty(keyMod)) {
              uniqueValues[keyMod] = [];
            }

            var indexOfCurrVal = uniqueValues[keyMod].map(function(obj) {
              return obj.value
            }).indexOf(val);

            // if < 0, then this is a new value that we should add
            if(indexOfCurrVal < 0) {
              uniqueValues[keyMod].push({
                filter: keyMod,
                value: val
              });
            }
          }
        }
      }
      return uniqueValues;
    };

    Potato.prototype.calculateFilters = function() {
      var uniqueValues = this.uniqueDataValues(this.data);

      this.categoricalFilters = [];
      this.numericFilters = [];

      for(var key in uniqueValues) {
        // if the first value is a number (removing % and ,) then the rest of the filter is
        // **probably** numeric
        var isNumeric = !isNaN(uniqueValues[key][0].value.replace(/%/,"").replace(/,/g,""));

        if(isNumeric) {
          this.numericFilters.push({
            value: key,
            type: 'num'
          });
        } else {
          // If every value is unique, or there are a lot of values
          // then this filter is, while not numeric, effectively not categorical, and we should ignore
          if(uniqueValues[key].length != this.data.length && uniqueValues[key].length < 500) {
            this.categoricalFilters.push({
              value: key,
              type: 'cat'
            });
          }
        }
      }

      this.createResetButton();
    };

    Potato.prototype.createResetButton = function() {
      var resetTooltip = $("<div class='tooltip' id='reset-tooltip'>Click and drag on the canvas to select nodes.</div>");
      var resetButton = $("<button id='reset-button' class='disabled-button modifier-button'><span id='reset-icon'>&#8635;</span> Reset Selection</button>");
      resetButton.on("click", (function(_this) {
        return function(e) {
          if (!resetButton.hasClass('disabled-button')) {
            return _this.add_all();
          }
        };
      })(this)).on("mouseover", (function(_this) {
        return function(e) {
          return resetTooltip.show();
        };
      })(this)).on("mouseout", (function(_this) {
        return function(e) {
          return resetTooltip.hide();
        };
      })(this));
      resetButton.append(resetTooltip);
      resetTooltip.hide();
      return $("#filter-select-buttons").append(resetButton);
    };

    Potato.prototype.parseNumericString = function(str) {
      return parseFloat(str.replace(/%/, "").replace(/,/g, ""));
    };

    // for a given filter, get the extent (min and max)
    Potato.prototype.getNumericExtent = function(filter) {
      var filterMax = 0;
      var filterMin = null;
      for(var i = 0; i < this.data.length; i++) {
        var currVal = this.parseNumericString(this.data[i][filter]);

        // ignore emptys (NaN)
        if(!isNaN(currVal)) {
          if(currVal > filterMax) {
            filterMax = currVal;
          }
          if(filterMin === null || currVal < filterMin) {
            filterMin = currVal;
          }
        }
      }

      return { min: filterMin, max: filterMax };
    };

    Potato.prototype.showDetails = function(data, i, element) {
      var content = "";
      var filters = [];
      for(var i=0; i<this.numericFilters.length; i++) {
        filters.push(this.numericFilters[i].value);
      }
      for(var i=0; i<this.categoricalFilters.length; i++) {
        filters.push(this.categoricalFilters[i].value);
      }
      for(var i=0; i<filters.length; i++) {
        var key = filters[i];
        content += key + ": " + data[key] + "<br/>";
      }
      $("#node-tooltip").html(content);
      this.updatePosition(d3.event, "node-tooltip");
      $("#node-tooltip").show();
//      this.highlightNode(d3.select(element), true);
    };

    Potato.prototype.hideDetails = function(data, i, element) {
      $("#node-tooltip").hide();
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
      var tth, ttleft, tttop, ttw, xOffset, yOffset;
      xOffset = 20;
      yOffset = 10;
      ttw = $("#" + id).width();
      tth = $("#" + id).height();
      ttleft = (e.pageX + xOffset * 2 + ttw) > $(window).width() ? e.pageX - ttw - xOffset * 2 : e.pageX + xOffset;
      tttop = (e.pageY + yOffset * 2 + tth) > $(window).height() ? e.pageY - tth - yOffset * 2 : e.pageY + yOffset;
      return $("#" + id).css('top', tttop + 'px').css('left', ttleft + 'px');
    };

    return Potato;

  })();

  root = typeof exports !== "undefined" && exports !== null ? exports : this;

}).call(this);
