const potato = require('./potato');
const d3 = require('./d3.v4.min.js');

describe('non stateful tests', () => {
  let chart = undefined;
  let potatoData = undefined;

  beforeEach(() => {
    const data = [
      { "age": "60", "name": "bob", "country": "USA" },
      { "age": "23", "name": "john", "country": "USA" }
    ];

    // this is the data structure that ^ data is transformed into in the app
    // it is usually the input to a lot of the helper functions
    potatoData = [
      {"age": "60", "country": "USA", "index": 0, "name": "bob",
       "radius": 2, "vx": 0, "vy": 0, "x": 0, "y": 0},
      {"age": "23", "country": "USA", "index": 1, "name": "john",
       "radius": 2, "vx": 0, "vy": 0, "x": -7.373688780783198, "y": 6.754902942615239}
    ];
    chart = new Potato(data);
  });

  test("init and parse data", () => {
    expect(chart.data).toEqual(potatoData);
  });


  describe("#parseNumericString", () => {
    const output = 100000;

    test("parseFloat of basic string numerics", () => {
      const input = "100000";
      expect(chart.parseNumericString(input)).toBe(output);
    });

    test("strips commas", () => {
      const input2 = "100,000";
      expect(chart.parseNumericString(input2)).toBe(output);
    });

    test("strips percents", () => {
      const input3 = "100000%";
      expect(chart.parseNumericString(input3)).toBe(output);
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
      expect(chart.getNumericExtent("age", input)).toEqual(output);
    });

    test("handles missing values", () => {
      const output = { "min": 3.5, "max": 7.2 };
      expect(chart.getNumericExtent("height", input)).toEqual(output);
    });

    test("handles string numerics thanks to #parseNumericString", () => {
      const output = { "min": 21.5, "max": 32000 };
      expect(chart.getNumericExtent("weight", input)).toEqual(output);
    });
  });
});
