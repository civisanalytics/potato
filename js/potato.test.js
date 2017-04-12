const Potato = require('./potato.js');

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

    chart = new Potato(csvData);
    expect(chart.data).toEqual(potatoData);
  });
});

describe("functional unit tests", () => {
  describe("#uniqueDataValues", () => {
    test("base case", () => {
      const inputData = [
        { "age": "60", "name": "bob" },
        { "age": "23", "name": "john" }
      ];
      const output = {
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
      expect(Potato.prototype.uniqueDataValues(inputData)).toEqual(output);
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

    test("default case", () => {
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
