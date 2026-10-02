// src/engine/astar.js - A* on the real road graph. Cost = estimated travel time in seconds.
import { MinHeap } from "./heap.js";
import { edgeTime } from "./graph.js";

// One best-first search used by both A* (useHeuristic = true) and the Dijkstra baseline (false).
export function search(graph, start, goal, useHeuristic = true) {
  const N = graph.nodes, gs = N[goal];
  // h(n) = straight-line metres * fastest possible seconds per metre -> never overestimates
  const h = n => useHeuristic ? Math.hypot(N[n].x - gs.x, N[n].y - gs.y) * graph.minSecPerM : 0;
  const g = { [start]: 0 }, prev = {}, closed = new Set(), open = new MinHeap();
  let explored = 0;                                       // nodes expanded, for the A* vs Dijkstra comparison
  open.push(h(start), start);

  while (open.size) {
    const cur = open.pop();
    if (closed.has(cur)) continue;                        // stale heap entry
    closed.add(cur); explored++;
    if (cur === goal) {                                   // rebuild the route backwards
      const path = [goal], edges = [];
      for (let n = goal; n !== start; n = prev[n].from) { edges.unshift(prev[n].edge); path.unshift(prev[n].from); }
      return { path, edges, cost: g[goal], explored };
    }
    for (const { to, edge } of graph.adj[cur]) {
      const t = edgeTime(edge);
      if (t === Infinity || closed.has(to)) continue;     // blocked road or already settled
      const ng = g[cur] + t;
      if (ng < (g[to] ?? Infinity)) { g[to] = ng; prev[to] = { from: cur, edge }; open.push(ng + h(to), to); }
    }
  }
  return { path: null, edges: [], cost: Infinity, explored };  // unreachable
}

export const aStar = (graph, start, goal) => search(graph, start, goal, true);