"use strict";

const ForceSplit = require('../js/forceSplit.js');

describe("label unit tests", () => {
  describe("#calculateLabelBounds", () => {
    const leftNode = { "country": "USA", "x": 150, "y": 180, "radius": 10 };
    const rightNode = { "country": "USA", "x": 240, "y": 210, "radius": 10 };
    const unrelatedNode = { "country": "Canada", "x": 210, "y": 200, "radius": 10 };

    test("base case", () => {
      const nodes = [ leftNode, rightNode, unrelatedNode ];
      const output = {
        avgX: 195, // avg x of all three nodes
        minX: leftNode.x - leftNode.radius,
        maxX: rightNode.x + rightNode.radius,
        minY: leftNode.y - leftNode.radius
      };
      expect(ForceSplit.prototype.calculateLabelBounds(nodes)).toEqual(output);
    });

    test("ignores nodes not on the screen", () => {
      const hiddenNode = { "country": "USA", "x": -100, "y": 100, "radius": 10 };
      expect(
        ForceSplit.prototype.calculateLabelBounds([leftNode, hiddenNode])
      ).toEqual(
        ForceSplit.prototype.calculateLabelBounds([leftNode])
      );
    });

    test("label specified, ignores unrelated nodes", () => {
      const nodes = [ leftNode, unrelatedNode ];
      const output = {
        avgX: leftNode.x,
        minX: leftNode.x - leftNode.radius,
        maxX: leftNode.x + leftNode.radius,
        minY: leftNode.y - leftNode.radius
      };
      expect(ForceSplit.prototype.calculateLabelBounds(nodes, "country", "USA")).toEqual(output);
    });

    test("label specified, all nodes relevant, effectively same as base case", () => {
      const nodes = [ leftNode, rightNode ];
      expect(
        ForceSplit.prototype.calculateLabelBounds(nodes, "country", "USA")
      ).toEqual(
        ForceSplit.prototype.calculateLabelBounds(nodes)
      );
    });
  });
});


describe("split unit tests", () => {
  describe("#calculateSplitLocations", () => {
    const width = 900;
    const height = 450;

    test("base case, just one key", () => {
      const uniqueKeys = ["Canada"];
      const output = ForceSplit.prototype.calculateSplitLocations(uniqueKeys, width, height);

      expect(output["Canada"].x).toEqual(width / 2);
      expect(output["Canada"].y).toEqual(height / 2);
    });

    test("four keys, (2x2)", () => {
      const uniqueKeys = ["Canada", "Uganda", "USA", "Venezuela"];
      const output = ForceSplit.prototype.calculateSplitLocations(uniqueKeys, width, height);

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
      const output = ForceSplit.prototype.calculateSplitLocations(uniqueKeys, width, height);

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
