"use strict";

const NodeSize = require('../js/nodeSize.js');

describe("size unit tests", () => {
  describe("#adjustSize", () => {
    const width = 1000;
    const height = 1000;

    test("base case, returns radius unchanged", () => {
      let radius = 10;
      const data = [
        { x: 40, y: 40 },
        { x: 40, y: 40 }
      ];
      expect(NodeSize.prototype.adjustSize(data, radius, width, height)).toEqual(radius);
    });

    test("at least one node is within 30 pixels of an edge", () => {
      let radius = 10;
      const data = [
        { x: 10, y: 10 },
        { x: 10, y: 10 }
      ];
      expect(NodeSize.prototype.adjustSize(data, radius, width, height)).toEqual(radius - 1);
    });

    test("no nodes are within 50 pixels of an edge", () => {
      let radius = 10;
      const data = [
        { x: 60, y: 60 },
        { x: 60, y: 60 }
      ];
      expect(NodeSize.prototype.adjustSize(data, radius, width, height)).toEqual(radius + 1);
    });
  });

  describe("#nodeInBox", () => {
    test("base case", () => {
      expect(NodeSize.prototype.nodeInBox(100, 100, 50, 50, 200, 200)).toEqual(true);
      expect(NodeSize.prototype.nodeInBox(0, 0, 50, 50, 200, 200)).toEqual(false);
    });
  });
});
