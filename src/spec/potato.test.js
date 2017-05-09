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

  describe("#nodeInBox", () => {
    test("base case", () => {
      expect(Potato.prototype.nodeInBox(100, 100, 50, 50, 200, 200)).toEqual(true);
      expect(Potato.prototype.nodeInBox(0, 0, 50, 50, 200, 200)).toEqual(false);
    });
  });
});

describe("split unit tests", () => {
  describe("#calculateSplitLocations", () => {
    const width = Potato.prototype.getWidth();
    const height = Potato.prototype.getHeight();

    test("base case, just one key", () => {
      const uniqueKeys = ["Canada"];
      const output = Potato.prototype.calculateSplitLocations(uniqueKeys);

      expect(output["Canada"].x).toEqual(width / 2);
      expect(output["Canada"].y).toEqual(height / 2);
    });

    test("four keys, (2x2)", () => {
      const uniqueKeys = ["Canada", "Uganda", "USA", "Venezuela"];
      const output = Potato.prototype.calculateSplitLocations(uniqueKeys);

      expect(output["Canada"].x).toEqual(output["USA"].x);
      expect(output["Uganda"].x).toEqual(output["Venezuela"].x);

      expect(output["Canada"].y).toEqual(output["Uganda"].y);
      expect(output["USA"].y).toEqual(output["Venezuela"].y);

      expect(output["Canada"].x).toBeLessThan(output["Uganda"].x);

      expect(output["Uganda"].y).toBeLessThan(output["Venezuela"].y);
    });

    test("five keys, aka awkward imbalanced grid", () => {
      const uniqueKeys = ["Canada", "Uganda", "USA", "Venezuela", "Togo"];
      // We expect 2 rows, 3 columns, first row has 3 items, second row has 2 items
      // ie.
      // Canada     --   Uganda   -- USA
      // Venezuela  --    Togo
      const output = Potato.prototype.calculateSplitLocations(uniqueKeys);

      expect(output["Canada"].x).toEqual(output["Venezuela"].x);
      expect(output["Uganda"].x).toEqual(output["Togo"].x);

      expect(output["Canada"].y).toEqual(output["Uganda"].y);
      expect(output["Canada"].y).toEqual(output["USA"].y);
      expect(output["Venezuela"].y).toEqual(output["Togo"].y);

      expect(output["Uganda"].x).toBeLessThan(output["USA"].x);

      expect(output["Canada"].y).toBeLessThan(output["Venezuela"].x);
    });
  });
});
