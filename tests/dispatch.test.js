
import test from "node:test";
import assert from "node:assert/strict";

import fs from "node:fs";
import { buildGraph } from "../src/engine/graph.js";
import { dispatch, releaseVehicle, resetAllVehicles } from "../src/engine/dispatch.js";
import { VEHICLES } from "../src/data/vehicles.js";

const city = JSON.parse(
  fs.readFileSync("./src/data/city.json", "utf8")
);
const graph = buildGraph(city);

function freshVehicles() {
  return structuredClone(VEHICLES);
}

test("dispatch assigns a reachable ambulance", () => {
  const vehicles = freshVehicles();
  const incidentNode = "n1641";

  const result = dispatch(
    graph,
    { ambulance: 1 },
    incidentNode,
    vehicles
  );

  assert.equal(result.assignments.length, 1);
  assert.equal(result.assignments[0].type, "ambulance");
  assert.equal(result.assignments[0].path.at(-1), incidentNode);
  assert.equal(result.assignments[0].vehicleId, "AMB1");
  assert.equal(vehicles[0].status, "dispatched");
});

test("dispatch reports shortages", () => {
  const vehicles = freshVehicles();

  const result = dispatch(
    graph,
    { ambulance: 3 },
    "n1641",
    vehicles
  );

  assert.equal(result.assignments.length, 2);
  assert.equal(result.shortages.length, 1);
  assert.equal(result.shortages[0].missing, 1);
});

test("releaseVehicle resets vehicle state", () => {
  const vehicles = freshVehicles();

  dispatch(graph, { ambulance: 1 }, "n1641", vehicles);
  releaseVehicle(vehicles, "AMB1");

  assert.equal(vehicles[0].status, "available");
  assert.equal(vehicles[0].node, vehicles[0].home);
  assert.equal(vehicles[0].path, null);
});

test("resetAllVehicles restores every vehicle", () => {
  const vehicles = freshVehicles();

  dispatch(
    graph,
    { ambulance: 1, fire_truck: 1 },
    "n1641",
    vehicles
  );

  resetAllVehicles(vehicles);

  for (const vehicle of vehicles) {
    assert.equal(vehicle.status, "available");
    assert.equal(vehicle.node, vehicle.home);
    assert.equal(vehicle.path, null);
  }
});
