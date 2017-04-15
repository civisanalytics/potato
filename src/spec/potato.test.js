"use strict";

const Potato = require('../js/potato.js');

describe("end to end tests", () => {
  test("init and parse data", () => {
    const csvData = [
      { "age": "60", "name": "bob", "country": "USA" },
      { "age": "23", "name": "john", "country": "USA" }
    ];
    const potatoData = [
      {"age": "60", "country": "USA", "index": 0, "name": "bob",
       "radius": 2, "vx": 0, "vy": 0, "x": 0, "y": 0},
      {"age": "23", "country": "USA", "index": 1, "name": "john",
       "radius": 2, "vx": 0, "vy": 0, "x": -7.373688780783198, "y": 6.754902942615239}
    ];

    var chart = new Potato(csvData);
    expect(chart.data).toEqual(potatoData);
  });
});

describe.only("label unit tests", () => {

  describe("#updateLabelPosition", () => {
    const leftNode = { "country": "USA", "x": 200, "y": 200, "radius": 10 };
    const rightNode = { "country": "USA", "x": 240, "y": 200, "radius": 10 };
    const otherNode = { "country": "Canada", "x": 50, "y": 200, "radius": 10 };
    const label = {
      "tarx": 100,
      "tary": 100,
      "type": "split",
      "split": "country",
      "val": "USA"
    };

    test("centers over correct node and ignores non related nodes", () => {
      const nodes = [ leftNode, otherNode ];
      const output = { tarx: 200, tary: 180 }; // tary is 20 pixels higher, 10 for radius + 10 for manual offset
      expect(Potato.prototype.updateLabelPosition(label, nodes)).toEqual(output);
    });

    test("centers between multiple correct nodes", () => {
      const nodes = [ leftNode, rightNode ];
      const output = { tarx: 220, tary: 180 };
      expect(Potato.prototype.updateLabelPosition(label, nodes)).toEqual(output);
    });
  });
});

describe("data unit tests", () => {

  describe("#enrichData", () => {
    test("base case", () => {

      const csvData = [
        { "money": "60", "age": "19", "country": "USA" },
        { "money": "23", "age": "27", "country": "USA" },
        { "money": "15", "age": "12", "country": "USA" },
        { "money": "92", "age": "100", "country": "USA" },
      ];

      const uniqueValues = Potato.prototype.uniqueDataValues(csvData);
      const uniqueFilters = Potato.prototype.calculateFilters(uniqueValues);

      const categoricalFilters = uniqueFilters.categoricalFilters;
      const numericFilters = uniqueFilters.numericFilters;

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
      expect(Potato.prototype.enrichData(csvData, uniqueValues, categoricalFilters, numericFilters)).toEqual(output);
    });
  });

  describe("#calculateFilters", () => {
    test("base case", () => {
      const output = {
        "categoricalFilters": ["name"],
        "numericFilters": ["age"]
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
      expect(Potato.prototype.calculateFilters(input)).toEqual(output);
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
      expect(Potato.prototype.uniqueDataValues(input)).toEqual(output);
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
      expect(Potato.prototype.uniqueDataValues(input)).toEqual(output);
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
      expect(Potato.prototype.uniqueDataValues(input)).toEqual(output);
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
      expect(Potato.prototype.uniqueDataValues(input)).toEqual(output);
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
      expect(Potato.prototype.uniqueDataValues(inputData)).toEqual(output);
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
      expect(Potato.prototype.uniqueDataValues(inputData)).toEqual(output);
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
      expect(Potato.prototype.uniqueDataValues(inputData)).toEqual(output);

      inputData.push({ "age": "100_foobar" });
      const newOutput = {
        "age": {
          "numValues": 101,
          "type": "unique",
          "values": expect.any(Object)
        }
      };
      expect(Potato.prototype.uniqueDataValues(inputData)).toEqual(newOutput);
    });
  });

  describe("#parseNumericString", () => {
    const output = 100000;

    test("parseFloat of basic string numerics", () => {
      const input = "100000";
      expect(Potato.prototype.parseNumericString(input)).toBe(output);
    });

    test("strips commas", () => {
      const input2 = "100,000";
      expect(Potato.prototype.parseNumericString(input2)).toBe(output);
    });

    test("strips percents", () => {
      const input3 = "100000%";
      expect(Potato.prototype.parseNumericString(input3)).toBe(output);
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
      expect(Potato.prototype.getNumericExtent("age", input)).toEqual(output);
    });

    test("handles missing values", () => {
      const output = { "min": 3.5, "max": 7.2 };
      expect(Potato.prototype.getNumericExtent("height", input)).toEqual(output);
    });

    test("handles string numerics thanks to #parseNumericString", () => {
      const output = { "min": 21.5, "max": 32000 };
      expect(Potato.prototype.getNumericExtent("weight", input)).toEqual(output);
    });
  });
});
