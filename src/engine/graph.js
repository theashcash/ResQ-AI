// src/engine/graph.js - turns city.json into a searchable graph. Pure logic, no DOM.
import { TRAFFIC_FACTOR, SIREN_FACTOR } from "../data/config.js";

export function buildGraph(city) {
  const adj = {};                                         // junction id -> [{ to, edge }]
  for (const id in city.nodes) adj[id] = [];
  for (const e of city.edges) {                           // roads are two-way (project decision)
    adj[e.from].push({ to: e.to, edge: e });
    adj[e.to].push({ to: e.from, edge: e });
  }
  // Fewest seconds any metre of road can take. Using it in the heuristic guarantees A* never overestimates.
  let minSecPerM = Infinity;
  for (const e of city.edges) minSecPerM = Math.min(minSecPerM, (SIREN_FACTOR * TRAFFIC_FACTOR[0]) / (e.speed / 3.6));
  return { meta: city.meta, nodes: city.nodes, edges: city.edges, adj, facilities: city.facilities, minSecPerM };
}

// Seconds to drive one road segment right now (Infinity when blocked).
export const edgeTime = e =>
  e.blocked ? Infinity : (e.length / (e.speed / 3.6)) * TRAFFIC_FACTOR[e.traffic] * SIREN_FACTOR;

// Junction closest to a map point (brute force is fine for ~5000 junctions).
export function nearestNode(graph, x, y) {
  let best = null, bd = Infinity;
  for (const id in graph.nodes) {
    const n = graph.nodes[id], d = (n.x - x) ** 2 + (n.y - y) ** 2;
    if (d < bd) { bd = d; best = id; }
  }
  return best;
}

// Drawable points of a route: each segment's real curve, oriented in the direction of travel.
export function routePoints(path, edges) {
  const pts = [];
  edges.forEach((e, i) => {
    const g = e.from === path[i] ? e.geometry : [...e.geometry].reverse();
    pts.push(...(i ? g.slice(1) : g));
  });
  return pts;
}