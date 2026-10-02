import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildGraph, edgeTime } from "../src/engine/graph.js";
import { aStar } from "../src/engine/astar.js";
import { dijkstra } from "../src/engine/baseline.js";

const graph = buildGraph(JSON.parse(readFileSync(new URL("../src/data/city.json", import.meta.url))));
const ids = Object.keys(graph.nodes);
let seed = 42; const rnd = n => ids[(seed = (seed * 1664525 + 1013904223) >>> 0) % n];   // repeatable pairs
const pairs = Array.from({ length: 150 }, () => [rnd(ids.length), rnd(ids.length)]);

test("A* finds the same optimal cost as Dijkstra on 150 random pairs", () => {
  let a = 0, d = 0;
  for (const [s, t] of pairs) {
    const ra = aStar(graph, s, t), rd = dijkstra(graph, s, t);
    assert.ok(Math.abs(ra.cost - rd.cost) < 1e-6, `${s}->${t}: ${ra.cost} vs ${rd.cost}`);
    a += ra.explored; d += rd.explored;
  }
  assert.ok(a < d, "A* should expand fewer nodes overall");
});

test("route is continuous: each edge joins consecutive junctions", () => {
  const r = aStar(graph, pairs[0][0], pairs[0][1]);
  r.edges.forEach((e, i) => assert.ok([e.from, e.to].includes(r.path[i]) && [e.from, e.to].includes(r.path[i + 1])));
});

test("blocked road is never used, and heavy traffic raises the cost", () => {
  const [s, t] = pairs.find(([s, t]) => aStar(graph, s, t).edges.length > 10);
  const base = aStar(graph, s, t), mid = base.edges[Math.floor(base.edges.length / 2)];
  mid.blocked = true;
  try {
    const r = aStar(graph, s, t);
    assert.ok(r.path && !r.edges.includes(mid) && r.cost >= base.cost);
  } finally { mid.blocked = false; }
  assert.equal(edgeTime({ ...mid, blocked: true }), Infinity);
  mid.traffic = 2;
  try { assert.ok(aStar(graph, s, t).cost >= base.cost); } finally { mid.traffic = 0; }
});