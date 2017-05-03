"use strict";

const DataParse = require('../js/dataParse.js');

describe("data unit tests", () => {

  describe("#enrichData", () => {
    test("base case", () => {

      const csvData = [
        { "money": "60", "age": "19", "country": "USA" },
        { "money": "23", "age": "27", "country": "USA" },
        { "money": "15", "age": "12", "country": "USA" },
        { "money": "92", "age": "100", "country": "USA" },
      ];

      const uniqueValues = DataParse.prototype.uniqueDataValues(csvData);
      const uniqueFilters = DataParse.prototype.calculateFilters(uniqueValues);

      const categorical = uniqueFilters.categorical;
      const numeric = uniqueFilters.numeric;

      const output = {
        "money": uniqueValues.money, // numeric filters should be unchanged!
        "age": uniqueValues.age, // numeric filters should be unchanged!
        "country": {
          "numValues": 1,
          "type": "cat",
          "values": {
            "USA": { "count": 4, "filter": "country", "value": "USA",
              "sums": {
                "money": 190,
                "age": 158
              },
              "means": {
                "money": 47.5,
                "age": 39.5
              }
            }
          }
        }
      };
      expect(DataParse.prototype.enrichData(csvData, uniqueValues, categorical, numeric)).toEqual(output);
    });
  });

  describe("#calculateFilters", () => {
    test("base case", () => {
      const output = {
        "categorical": ["name"],
        "numeric": ["age"]
      };
      const input = {
        "age": {
          "numValues": 2,
          "type": "num",
          "values": {
            "23": { "count": 1, "filter": "age", "value": "23" },
            "60": { "count": 1, "filter": "age", "value": "60" }
          }
        },
        "name": {
          "numValues": 2,
          "type": "cat",
          "values": {
            "bob": { "count": 1, "filter": "name", "value": "bob" },
            "john": { "count": 1, "filter": "name", "value": "john" }
          }
        }
      };
      expect(DataParse.prototype.calculateFilters(input)).toEqual(output);
    });
  });

  describe("#uniqueDataValues", () => {
    test("base case", () => {
      const input = [
        { "age": "60", "country": "USA" },
        { "age": "47", "country": "USA" },
        { "age": "23", "country": "Canada" }
      ];
      const output = {
        "age": {
          "numValues": 3,
          "type": "num",
          "values": {
            "60": { "count": 1, "filter": "age", "value": "60" },
            "47": { "count": 1, "filter": "age", "value": "47" },
            "23": { "count": 1, "filter": "age", "value": "23" }
          }
        },
        "country": {
          "numValues": 2,
          "type": "cat",
          "values": {
            "USA": { "count": 2, "filter": "country", "value": "USA" },
            "Canada": { "count": 1, "filter": "country", "value": "Canada" }
          }
        }
      };
      expect(DataParse.prototype.uniqueDataValues(input)).toEqual(output);
    });

    test("identifies as categorical if at least one data point is non-numeric", () => {
      const input = [
        { "life": "1337" },
        { "life": "42" },
        { "life": "pursuit of happiness" },
        { "life": "n0mz" },
        { "life": "n0mz" }
      ];
      const output = {
        "life": {
          "numValues": 4,
          "type": "cat",
          "values": {
            "1337": { "count": 1, "filter": "life", "value": "1337" },
            "42": { "count": 1, "filter": "life", "value": "42" },
            "pursuit of happiness": { "count": 1, "filter": "life", "value": "pursuit of happiness" },
            "n0mz": { "count": 2, "filter": "life", "value": "n0mz" }
          }
        }
      };
      expect(DataParse.prototype.uniqueDataValues(input)).toEqual(output);
    });

    test("handles nulls", () => {
      const input = [
        { "color": "red", "country": "" },
        { "color": "", "country": "USA" },
        { "color": "blue", "country": "USA" },
        { "color": "blue", "country": "USA" }
      ];
      const output = {
        "color": {
          "numValues": 3,
          "type": "cat",
          "values": {
            "red": { "count": 1, "filter": "color", "value": "red" },
            "blue": { "count": 2, "filter": "color", "value": "blue" },
            "": { "count": 1, "filter": "color", "value": "" }
          }
        },
        "country": {
          "numValues": 2,
          "type": "cat",
          "values": {
            "USA": { "count": 3, "filter": "country", "value": "USA" },
            "": { "count": 1, "filter": "country", "value": "" }
          }
        }
      };
      expect(DataParse.prototype.uniqueDataValues(input)).toEqual(output);
    });

    test("counts duplicate categorical values", () => {
      const input = [
        { "color": "red" },
        { "color": "red" },
        { "color": "blue" },
      ];
      const output = {
        "color": {
          "numValues": 2,
          "type": "cat",
          "values": {
            "red": { "count": 2, "filter": "color", "value": "red" },
            "blue": { "count": 1, "filter": "color", "value": "blue" }
          }
        }
      };
      expect(DataParse.prototype.uniqueDataValues(input)).toEqual(output);
    });

    test("counts duplicate numerics and rounds properly", () => {
      const inputData = [
        { "age": "61" },
        { "age": "61" },
        { "age": "61.0" }, // TODO: I'd like this to round properly?
        { "age": "15" }
      ];
      const output = {
        "age": {
          "numValues": 3,
          "type": "num",
          "values": {
            "15": { "count": 1, "filter": "age", "value": "15" },
            "61": { "count": 2, "filter": "age", "value": "61" },
            "61.0": { "count": 1, "filter": "age", "value": "61.0" }
          }
        }
      };
      expect(DataParse.prototype.uniqueDataValues(inputData)).toEqual(output);
    });

    test("categoricals with only unique values are labeled unique", () => {
      let inputData = [];
      for(var i=0; i<10; i++) {
        inputData.push({ "age": `${i}_foobar` });
      }
      const output = {
        "age": {
          "numValues": 10,
          "type": "unique",
          "values": expect.any(Object)
        }
      };
      expect(DataParse.prototype.uniqueDataValues(inputData)).toEqual(output);
    });

    test("categoricals with more than 100 values are labeled unique", () => {
      let inputData = [{ "age": "0_foobar" }];
      for(var i=0; i<100; i++) {
        // the first one is a duplicate to prevent this from being identified as unique
        inputData.push({ "age": `${i}_foobar` });
      }
      const output = {
        "age": {
          "numValues": 100,
          "type": "cat",
          "values": expect.any(Object)
        }
      };
      expect(DataParse.prototype.uniqueDataValues(inputData)).toEqual(output);

      inputData.push({ "age": "100_foobar" });
      const newOutput = {
        "age": {
          "numValues": 101,
          "type": "unique",
          "values": expect.any(Object)
        }
      };
      expect(DataParse.prototype.uniqueDataValues(inputData)).toEqual(newOutput);
    });
  });


  describe("#parseNumericString", () => {
    const output = 100000;

    test("parseFloat of basic string numerics", () => {
      const input = "100000";
      expect(DataParse.prototype.parseNumericString(input)).toBe(output);
    });

    test("strips commas", () => {
      const input2 = "100,000";
      expect(DataParse.prototype.parseNumericString(input2)).toBe(output);
    });

    test("strips percents", () => {
      const input3 = "100000%";
      expect(DataParse.prototype.parseNumericString(input3)).toBe(output);
    });
  });

  describe("#getNumericExtent", () => {
    const input = [
      { "age": "23", "height": "7.2", "weight": "32,000" },
      { "age": "51", "height": "", "weight": "52%" },
      { "age": "60", "height": "3.5", "weight": "21.5%" }
    ];

    test("base case", () => {
      const output = { "min": 23, "max": 60 };
      expect(DataParse.prototype.getNumericExtent("age", input)).toEqual(output);
    });

    test("handles missing values", () => {
      const output = { "min": 3.5, "max": 7.2 };
      expect(DataParse.prototype.getNumericExtent("height", input)).toEqual(output);
    });

    test("handles string numerics thanks to #parseNumericString", () => {
      const output = { "min": 21.5, "max": 32000 };
      expect(DataParse.prototype.getNumericExtent("weight", input)).toEqual(output);
    });
  });

});
