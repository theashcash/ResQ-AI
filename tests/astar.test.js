import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildGraph, edgeTime } from "../src/engine/graph.js";
import { aStar } from "../src/engine/astar.js";
import { dijkstra } from "../src/engine/baseline.js";

const city = JSON.parse(
  readFileSync(new URL("../src/data/city.json", import.meta.url), "utf8")
);
const graph = buildGraph(city);

test("A* returns the same optimal cost as Dijkstra for deterministic node pairs", () => {
  const ids = Object.keys(graph.nodes);
  // Deterministic spread across the graph; no random IDs or external state.
  const pairs = Array.from({ length: Math.min(150, ids.length) }, (_, i) => [
    ids[(i * 37) % ids.length],
    ids[(i * 97 + 13) % ids.length],
  ]);

  for (const [start, goal] of pairs) {
    const actual = aStar(graph, start, goal);
    const expected = dijkstra(graph, start, goal);
    assert.equal(actual.path === null, expected.path === null, `${start} -> ${goal}: reachability`);
    if (actual.path !== null) {
      assert.ok(Math.abs(actual.cost - expected.cost) < 1e-6,
        `${start} -> ${goal}: A*=${actual.cost}, Dijkstra=${expected.cost}`);
    } else {
      assert.equal(actual.cost, Infinity);
    }
  }
});

test("every returned route has edges connecting consecutive path nodes", () => {
  const start = Object.keys(graph.nodes)[0];
  const goal = Object.keys(graph.nodes).at(-1);
  const route = aStar(graph, start, goal);

  if (route.path === null) {
    assert.equal(route.edges.length, 0);
    return;
  }

  assert.equal(route.path.length, route.edges.length + 1);
  route.edges.forEach((edge, i) => {
    const from = route.path[i];
    const to = route.path[i + 1];
    assert.ok(
      (edge.from === from && edge.to === to) ||
      (edge.from === to && edge.to === from),
      `edge ${i} does not connect ${from} and ${to}`,
    );
  });
});

test("blocked edges are excluded and traffic increases edge cost", () => {
  const edge = graph.edges.find(e => !e.blocked && Number.isFinite(edgeTime(e)));
  assert.ok(edge, "fixture graph should contain a usable edge");

  const originalBlocked = edge.blocked;
  const originalTraffic = edge.traffic;
  try {
    const normal = edgeTime(edge);
    edge.traffic = 2;
    const heavy = edgeTime(edge);
    assert.ok(heavy >= normal, "heavier traffic must not reduce travel time");

    edge.blocked = true;
    assert.equal(edgeTime(edge), Infinity);
  } finally {
    edge.blocked = originalBlocked;
    edge.traffic = originalTraffic;
  }
});