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

describe("label unit tests", () => {

  describe("#updateSplitLabelPosition", () => {
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
      expect(Potato.prototype.updateSplitLabelPosition(label, nodes)).toEqual(output);
    });

    test("centers between multiple correct nodes", () => {
      const nodes = [ leftNode, rightNode ];
      const output = { tarx: 220, tary: 180 };
      expect(Potato.prototype.updateSplitLabelPosition(label, nodes)).toEqual(output);
    });
  });
});
