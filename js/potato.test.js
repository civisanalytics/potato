const potato = require('./potato');
const d3 = require('./d3.v4.min.js');

describe('non stateful tests', () => {
  let chart = undefined;

  beforeEach(() => {
    const data = [
      { "age": "60", "name": "bob", "country": "USA" },
      { "age": "23", "name": "john", "country": "USA" }
    ];
    chart = new Potato(data);
  });

  test('init and parse data', () => {
    // Theoretically the x/y should be deterministic thanks to d3v4 deterministic force graphs
    // ... maybe?...
    const expectedData = [
      {"age": "60", "country": "USA", "index": 0, "name": "bob",
       "radius": 2, "vx": 0, "vy": 0, "x": 0, "y": 0},
      {"age": "23", "country": "USA", "index": 1, "name": "john",
       "radius": 2, "vx": 0, "vy": 0, "x": -7.373688780783198, "y": 6.754902942615239}
    ];
    expect(chart.data).toEqual(expectedData);
  });

  test("#parseNumericString", () => {
    const input = "100,000%";
    const output = 100000;
    expect(chart.parseNumericString(input)).toBe(output);

    const input2 = "100,000";
    expect(chart.parseNumericString(input2)).toBe(output);

    const input3 = "100000%";
    expect(chart.parseNumericString(input3)).toBe(output);
  });

  //test("#resetToDefaultSize
});
