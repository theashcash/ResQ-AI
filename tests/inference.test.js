import { test } from "node:test";
import assert from "node:assert/strict";
import { inferResources } from "../src/engine/inference.js";

test("accident with injuries requests ambulance and police", () => {
  const plan = inferResources({
    type: "accident",
    severity: "low",
    peopleInvolved: 2,
    injured: 1,
    fire: false,
  });
  assert.equal(plan.needs.ambulance, 1);
  assert.equal(plan.needs.police, 1);
  assert.equal(plan.needs.fire_truck, 0);
  assert.ok(plan.trace.some(t => t.startsWith("R1 ")));
});

test("forward chaining: R7 sets CRITICAL then R8 raises police", () => {
  const plan = inferResources({
    type: "accident",
    severity: "high",
    peopleInvolved: 6,
    injured: 3,
    fire: true,
  });
  assert.equal(plan.priority, "CRITICAL");
  assert.equal(plan.needs.ambulance, 2);
  assert.equal(plan.needs.police, 2);
  assert.equal(plan.needs.fire_truck, 2);
  assert.ok(plan.trace.some(t => t.startsWith("R7 ")));
  assert.ok(plan.trace.some(t => t.startsWith("R8 ")));
});
