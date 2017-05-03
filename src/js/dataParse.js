function DataParse(data) {
}

// given data, and uniqueValues, enrich uniqueValues with sums/means/counts
DataParse.prototype.enrichData = function(data, uniqueValues) {
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
DataParse.prototype.calculateFilters = function(uniqueValues) {
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
DataParse.prototype.uniqueDataValues = function(data) {
  var uniqueValues = {};

  data.forEach(function(row) {
    for(var key in row) {
      var val = row[key];

      // TODO: this is probably not a safe assumption...
      // the integers are the ids and node coords and other non dataset things
      if(typeof val === 'string') {
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

DataParse.prototype.parseNumericString = function(str) {
  return parseFloat(str.replace(/%/, "").replace(/,/g, ""));
}

// For a given filter, get the extent (min and max)
// it's a bit fancier than d3.extent as it ignores NaNs and also does
// string parsing of "numerics"
DataParse.prototype.getNumericExtent = function(filter, data) {
  var filterMax = 0;
  var filterMin = null;

  data.forEach(function(row) {
    var currVal = DataParse.prototype.parseNumericString(row[filter]);
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


module.exports = DataParse;
