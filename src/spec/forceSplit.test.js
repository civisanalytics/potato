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
