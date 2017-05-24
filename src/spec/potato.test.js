"use strict";

const Potato = require('../js/potato.js');

describe("end to end tests", () => {
  test("init and parse data", () => {
    const csvData = [
      { "age": "60", "name": "bob", "country": "USA" },
      { "age": "23", "name": "john", "country": "USA" }
    ];
    const potatoData = [
      {"age": "60", "country": "USA", "index": 0, "name": "bob", "potatoID": 0,
       "radius": 2, "vx": 0, "vy": 0, "x": 0, "y": 0},
      {"age": "23", "country": "USA", "index": 1, "name": "john", "potatoID": 1,
       "radius": 2, "vx": 0, "vy": 0, "x": -7.373688780783198, "y": 6.754902942615239}
    ];

    var chart = new Potato(csvData);
    expect(chart.data).toEqual(potatoData);
  });
});

describe("drag select unit tests", () => {
  describe("#calculateDragBox", () => {
    const dragOutput = {
      width: 50, height: 100,
      x: 100, y: 100
    };

    test("base case", () => {
      expect(Potato.prototype.calculateDragBox(100, 100, 150, 200)).toEqual(dragOutput);
    });

    test("inverted drag box", () => {
      expect(Potato.prototype.calculateDragBox(150, 200, 100, 100)).toEqual(dragOutput);
    });
  });
});
