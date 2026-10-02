import test from "node:test";
import assert from "node:assert/strict";
import { inferResources } from "../src/engine/inference.js";

// 1. Minor accident should infer LOW severity
test("minor accident infers LOW severity", () => {
  const incident = {
    type: "accident",
    peopleInvolved: 1,
    injured: 0,
    fire: false,
    hazard: false,
  };

  const result = inferResources(incident);

  assert.equal(result.severity, "LOW");
  assert.equal(result.priority, "NORMAL");
});

// 2. Multiple injuries should infer HIGH severity
test("multiple injuries infer HIGH severity", () => {
  const incident = {
    type: "accident",
    peopleInvolved: 4,
    injured: 3,
    fire: false,
    hazard: false,
  };

  const result = inferResources(incident);

  assert.equal(result.severity, "HIGH");
  assert.equal(result.priority, "CRITICAL");
  assert.equal(result.needs.ambulance, 2);
});

// 3. Fire incident should infer severity and request fire services
test("fire incident infers severity and requests fire services", () => {
  const incident = {
    type: "fire",
    peopleInvolved: 2,
    injured: 0,
    fire: true,
    hazard: false,
  };

  const result = inferResources(incident);

  assert.equal(result.severity, "MEDIUM");
  assert.equal(result.needs.fire_truck, 1);
  assert.ok(result.trace.length > 0);
});

// 4. High severity should infer CRITICAL priority
test("high severity infers CRITICAL priority", () => {
  const incident = {
    type: "building_accident",
    peopleInvolved: 5,
    injured: 3,
    fire: false,
    hazard: false,
  };

  const result = inferResources(incident);

  assert.equal(result.severity, "HIGH");
  assert.equal(result.priority, "CRITICAL");
});

// 5. Critical incident should request additional resources
test("critical incident requests additional resources", () => {
  const incident = {
    type: "accident",
    peopleInvolved: 5,
    injured: 3,
    fire: false,
    hazard: false,
  };

  const result = inferResources(incident);

  assert.equal(result.priority, "CRITICAL");
  assert.equal(result.needs.ambulance, 2);
  assert.equal(result.needs.police, 2);
});

test("15 injured people require 5 ambulances", () => {
  const result = inferResources({
    type: "building_accident",
    peopleInvolved: 30,
    injured: 15,
    fire: true,
    hazard: true
  });

  assert.equal(result.needs.ambulance, 5);
  assert.equal(result.needs.police, 3);
  assert.equal(result.needs.fire_truck, 3);
  assert.equal(result.severity, "HIGH");
  assert.equal(result.priority, "CRITICAL");
});

test("6 to 10 injured people require 3 ambulances", () => {
  const result = inferResources({
    type: "accident",
    peopleInvolved: 10,
    injured: 8,
    fire: false,
    hazard: false
  });

  assert.equal(result.needs.ambulance, 3);
});

test("11 injured people trigger expanded resource requirements", () => {
  const result = inferResources({
    type: "building_accident",
    peopleInvolved: 20,
    injured: 11,
    fire: true,
    hazard: true
  });

  assert.equal(result.needs.ambulance, 5);
  assert.equal(result.needs.police, 3);
  assert.equal(result.needs.fire_truck, 3);
});