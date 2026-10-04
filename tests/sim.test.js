import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildGraph } from "../src/engine/graph.js";
import { aStar } from "../src/engine/astar.js";
import { dispatch } from "../src/engine/dispatch.js";
import { advance, refresh, tripCost } from "../src/engine/sim.js";
import { inferResources } from "../src/engine/inference.js";
import { buildFleet, setBusy } from "../src/data/fleet.js";
import { applyTimeOfDay } from "../src/engine/traffic.js";

const graph = buildGraph(JSON.parse(readFileSync(new URL("../src/data/city.json", import.meta.url))));
const ids = Object.keys(graph.nodes);
const unit = (node, type = "ambulance") => ({ id: "T1", type, node, home: node, status: "available", path: null, edges: null, destination: null, moving: false, s: 0 });
// a far pair whose route has plenty of segments, so a mid-route closure is meaningful
const [A, B] = ids.flatMap(a => ids.slice(0, 400).map(b => [a, b])).find(([a, b]) => aStar(graph, a, b).edges.length > 25);
function launch() {
  const v = unit(A); dispatch(graph, { ambulance: 1 }, B, [v]); v.moving = true; return v;
}

test("a unit's modelled time equals A*'s estimate, and distance and cost are recorded", () => {
  const planned = aStar(graph, A, B), v = launch();
  while (v.status !== "arrived") advance(v, 1);
  assert.ok(Math.abs(v.elapsed - planned.cost) < 2);
  assert.ok(Math.abs(v.distance - planned.edges.reduce((t, e) => t + e.length, 0)) < 5);
  assert.equal(v.node, B);
  assert.ok(tripCost(v) > 0 && v.cost === tripCost(v));
});

test("blocking a road ahead replans immediately and the unit still arrives, avoiding the closed road", () => {
  const v = launch(); advance(v, 40);
  const closed = v.edges[10];
  closed.blocked = true;
  try {
    const ev = refresh(graph, v, closed);
    assert.equal(ev.type, "rerouted"); assert.equal(v.reroutes, 1);
    assert.ok(!v.edges.includes(closed) && ev.delta >= 0);
    while (v.status !== "arrived") advance(v, 1);
    assert.equal(v.node, B);
  } finally { closed.blocked = false; }
});

test("with every road into the destination closed the unit stops, and resumes when one reopens", () => {
  const v = launch(); advance(v, 20);
  const into = graph.adj[B].map(a => a.edge); into.forEach(e => (e.blocked = true));
  try {
    assert.equal(refresh(graph, v, into[0]).type, "stuck"); assert.equal(v.status, "stuck"); assert.equal(v.moving, false);
    into[0].blocked = false;
    assert.equal(refresh(graph, v, into[0]).type, "resumed"); assert.equal(v.moving, true);
  } finally { into.forEach(e => (e.blocked = false)); }
});

test("fleet is built from facilities (3 per station) and the busy toggle leaves one unit per station", () => {
  const fleet = buildFleet(graph.facilities);
  assert.equal(fleet.length, graph.facilities.length * 3);
  setBusy(fleet, true);
  assert.equal(fleet.filter(v => v.status === "available").length, graph.facilities.length);
  setBusy(fleet, false);
  assert.ok(fleet.every(v => v.status === "available"));
});

test("a preview dispatch changes nothing; a committed one marks the units", () => {
  const fleet = buildFleet(graph.facilities);
  const preview = dispatch(graph, { ambulance: 2 }, B, fleet, false);
  assert.equal(preview.assignments.length, 2); assert.ok(fleet.every(v => v.status === "available"));
  dispatch(graph, { ambulance: 2 }, B, fleet);
  assert.equal(fleet.filter(v => v.status === "dispatched").length, 2);
});

test("medical emergencies and building accidents always get a response", () => {
  assert.ok(inferResources({ type: "medical_emergency", peopleInvolved: 1, injured: 0, fire: false, hazard: false }).needs.ambulance >= 1);
  assert.ok(inferResources({ type: "building_accident", peopleInvolved: 2, injured: 0, fire: false, hazard: false }).needs.fire_truck >= 1);
});

test("switching to evening rush while a unit is driving is handled and the unit still arrives", () => {
  const v = launch(); advance(v, 30);
  const saved = graph.edges.map(e => e.traffic);
  try {
    const changed = applyTimeOfDay(graph, "evening");
    refresh(graph, v, changed);                                    // may reroute or keep its route; must not break
    while (v.status !== "arrived") advance(v, 1);
    assert.equal(v.node, B);
  } finally { graph.edges.forEach((e, i) => { e.traffic = saved[i]; e.userSet = false; }); }
});