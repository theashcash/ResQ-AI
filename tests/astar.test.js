// tests/astar.test.js

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  aStar,
  edgeCost,
  heuristic
} from "../src/engine/astar.js";

import { EDGES } from "../src/data/city.js";


// ==========================================
// TEST 1
// Direct route with no traffic
// ==========================================

test("finds a direct route with no traffic", () => {

  const r = aStar("A", "B");

  assert.deepEqual(
    r.path,
    ["A", "B"]
  );

  assert.equal(
    r.cost,
    200
  );
});


// ==========================================
// TEST 2
// Traffic increases edge cost
// ==========================================

test("heavy traffic increases route cost", () => {

  const normalEdge = {
    from: "E",
    to: "F",
    dist: 200,
    traffic: 0,
    blocked: false
  };

  const heavyTrafficEdge = {
    from: "E",
    to: "F",
    dist: 200,
    traffic: 2,
    blocked: false
  };

  const normalCost = edgeCost(normalEdge);
  const heavyCost = edgeCost(heavyTrafficEdge);

  assert.equal(normalCost, 200);
  assert.equal(heavyCost, 400);

  assert.ok(
    heavyCost > normalCost
  );
});


// ==========================================
// TEST 3
// A* finds a route
// ==========================================

test("finds a route from E to J", () => {

  const r = aStar("E", "J");

  assert.ok(
    r.path !== null
  );

  assert.ok(
    r.path.length > 0
  );

  assert.ok(
    r.cost < Infinity
  );

});


// ==========================================
// TEST 4
// Blocked road must not be used
// ==========================================

test("blocked road is never used", () => {

  const edge = EDGES.find(
    e => e.from === "E" && e.to === "F"
  );

  // Make sure we actually found the edge
  assert.ok(edge);

  // Temporarily block it
  edge.blocked = true;

  try {

    const r = aStar("E", "F");

    // There should still be another route
    assert.ok(r.path !== null);

    // The direct E → F path should not be used
    assert.ok(
      r.path.length > 2
    );

    // Make sure E → F is not present as a direct step
    assert.notDeepEqual(
      r.path,
      ["E", "F"]
    );

  } finally {

    // ALWAYS restore the graph
    edge.blocked = false;

  }

});


// ==========================================
// TEST 5
// Heuristic returns a valid distance
// ==========================================

test("heuristic calculates straight-line distance", () => {

  const h = heuristic("A", "B");

  assert.equal(
    h,
    200
  );

});