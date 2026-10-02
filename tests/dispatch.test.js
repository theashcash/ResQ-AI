import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGraph } from "../src/engine/graph.js";
import { dispatch, releaseVehicle, resetAllVehicles } from "../src/engine/dispatch.js";

// Small controlled graph and fleet: tests should not depend on the real map's
// facility locations, fleet size, or whichever vehicle happens to be nearest.
function fixture() {
  const graph = buildGraph({
    nodes: {
      A: { x: 0, y: 0 },
      B: { x: 10, y: 0 },
      C: { x: 20, y: 0 },
      D: { x: 30, y: 0 },
    },
    edges: [
      { id: "AB", from: "A", to: "B", length: 10, speed: 36, traffic: 0, blocked: false, geometry: [[0, 0], [10, 0]] },
      { id: "BC", from: "B", to: "C", length: 10, speed: 36, traffic: 0, blocked: false, geometry: [[10, 0], [20, 0]] },
      { id: "CD", from: "C", to: "D", length: 10, speed: 36, traffic: 0, blocked: false, geometry: [[20, 0], [30, 0]] },
    ],
    facilities: [],
    meta: {},
  });
  const vehicles = [
    { id: "NEAR", type: "ambulance", node: "C", home: "C", status: "available", path: null, edges: null, destination: null },
    { id: "FAR", type: "ambulance", node: "A", home: "A", status: "available", path: null, edges: null, destination: null },
    { id: "FIRE", type: "fire_truck", node: "A", home: "A", status: "available", path: null, edges: null, destination: null },
  ];
  return { graph, vehicles };
}

test("dispatch selects the lowest-cost reachable unit of the requested type", () => {
  const { graph, vehicles } = fixture();
  const result = dispatch(graph, { ambulance: 1 }, "D", vehicles);

  assert.equal(result.assignments.length, 1);
  assert.equal(result.assignments[0].vehicleId, "NEAR");
  assert.equal(result.assignments[0].path.at(-1), "D");
  assert.equal(vehicles.find(v => v.id === "NEAR").status, "dispatched");
  assert.equal(vehicles.find(v => v.id === "FAR").status, "available");
});

test("dispatch reports the exact shortage when fewer units are available than needed", () => {
  const { graph, vehicles } = fixture();
  const result = dispatch(graph, { ambulance: 3 }, "D", vehicles);

  assert.equal(result.assignments.length, 2);
  assert.deepEqual(result.shortages, [
    { type: "ambulance", needed: 3, sent: 2, missing: 1 },
  ]);
});

test("unreachable vehicles are not assigned and count toward shortages", () => {
  const { graph, vehicles } = fixture();
  graph.edges.forEach(edge => { edge.blocked = true; });

  const result = dispatch(graph, { ambulance: 1 }, "D", vehicles);
  assert.equal(result.assignments.length, 0);
  assert.equal(result.shortages[0].missing, 1);
});

test("releaseVehicle restores the selected unit to its home node", () => {
  const { graph, vehicles } = fixture();
  dispatch(graph, { ambulance: 1 }, "D", vehicles);
  releaseVehicle(vehicles, "NEAR");

  const vehicle = vehicles.find(v => v.id === "NEAR");
  assert.equal(vehicle.status, "available");
  assert.equal(vehicle.node, vehicle.home);
  assert.equal(vehicle.path, null);
  assert.equal(vehicle.edges, null);
  assert.equal(vehicle.destination, null);
});

test("resetAllVehicles restores every unit, including dispatched units", () => {
  const { graph, vehicles } = fixture();
  dispatch(graph, { ambulance: 1, fire_truck: 1 }, "D", vehicles);
  resetAllVehicles(vehicles);

  for (const vehicle of vehicles) {
    assert.equal(vehicle.status, "available");
    assert.equal(vehicle.node, vehicle.home);
    assert.equal(vehicle.path, null);
    assert.equal(vehicle.edges, null);
    assert.equal(vehicle.destination, null);
  }
});