import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildGraph } from "../src/engine/graph.js";
import { applyTimeOfDay, trafficFor } from "../src/engine/traffic.js";
import { TIME_OF_DAY } from "../src/data/config.js";

const graph = buildGraph(JSON.parse(readFileSync(new URL("../src/data/city.json", import.meta.url))));
const original = graph.edges.map(e => e.traffic);
const restore = () => graph.edges.forEach((e, i) => { e.traffic = original[i]; e.userSet = false; });
const mainRoads = graph.edges.filter(e => ["trunk", "primary"].includes(e.road));
const avg = list => list.reduce((t, e) => t + e.traffic, 0) / list.length;

test("every time-of-day row is a valid probability split", () => {
  for (const [mode, t] of Object.entries(TIME_OF_DAY))
    for (const [k, p] of Object.entries(t)) if (Array.isArray(p)) assert.ok(Math.abs(p.reduce((a, b) => a + b) - 1) < 1e-9, `${mode}.${k}`);
});

test("traffic is repeatable and rush hours are heavier on main roads than off-peak", () => {
  try {
    applyTimeOfDay(graph, "offpeak"); const off = avg(mainRoads);
    applyTimeOfDay(graph, "morning"); const morning = avg(mainRoads);
    applyTimeOfDay(graph, "evening"); const evening = avg(mainRoads);
    assert.ok(off < morning && morning < evening, `${off} < ${morning} < ${evening}`);
    assert.equal(applyTimeOfDay(graph, "evening").size, 0, "same mode twice changes nothing");
    assert.ok(graph.edges.every(e => e.traffic === trafficFor(e, "evening")));
  } finally { restore(); }
});

test("a road set by hand keeps its traffic when the time of day changes", () => {
  const e = mainRoads[0];
  try {
    e.userSet = true; e.traffic = 0;
    applyTimeOfDay(graph, "evening");
    assert.equal(e.traffic, 0);
  } finally { restore(); }
});