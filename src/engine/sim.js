// src/engine/sim.js - movement along real roads, modelled time and cost, and mid-journey replanning.
// Pure logic (no DOM). A unit's route is v.path (junction ids, starting at the junction it last passed)
// and v.edges (road segments); v.s is the metres already driven along edges[0].
import { TRAFFIC_FACTOR, SIREN_FACTOR, COST_RATES } from "../data/config.js";
import { edgeTime, routePoints } from "./graph.js";
import { reroute } from "./reroute.js";

// Metres per second on a segment right now. A unit already on a road that gets closed still finishes it.
export const segSpeed = e => (e.speed / 3.6) / (TRAFFIC_FACTOR[e.traffic] * SIREN_FACTOR);

// Called when a unit is dispatched: reset its trip counters and remember the original route (for the "ghost" line).
export function initRun(v, plannedSeconds) {
  Object.assign(v, { moving: false, s: 0, elapsed: 0, distance: 0, reroutes: 0, delta: 0, plannedSeconds,
    original: routePoints(v.path, v.edges) });
}

// Estimated time still to drive. ignoreBlocked=true prices closed roads as if open (used to measure a detour's cost).
export function estimate(v, ignoreBlocked = false) {
  return v.edges.reduce((t, e, i) => t + (i === 0 && v.s > 0 ? (e.length - v.s) / segSpeed(e)
    : ignoreBlocked ? e.length / segSpeed(e) : edgeTime(e)), 0);
}

export const tripCost = v => {
  const r = COST_RATES[v.type];
  return Math.round(r.perKm * (v.distance / 1000) + r.perMin * (v.elapsed / 60));   // rupees, an estimate
};

// Move a unit forward by dt MODELLED seconds along its route.
export function advance(v, dt) {
  while (dt > 1e-9 && v.moving && v.edges.length) {
    const e = v.edges[0], u = segSpeed(e), need = (e.length - v.s) / u;
    if (dt < need) { v.s += u * dt; v.elapsed += dt; v.distance += u * dt; return; }
    dt -= need; v.elapsed += need; v.distance += e.length - v.s;       // reached the end of this segment
    v.s = 0; v.path.shift(); v.edges.shift(); v.node = v.path[0];
    if (!v.edges.length) { Object.assign(v, { moving: false, status: "arrived", s: 0 }); v.cost = tripCost(v); return; }
  }
}

// Has this change touched part of the route the unit has not started yet? (The segment it is on is exempt.)
export function routeAffected(v, edge) {
  if (!v.edges?.length) return false;
  const hit = e => (edge instanceof Set ? edge.has(e) : e === edge) || e.blocked;   // edge may be one road or a Set of roads
  return (v.s > 0 ? v.edges.slice(1) : v.edges).some(hit);
}

// Replan from the end of the segment the unit is on (or from its junction if it is at one). Returns false if no route exists.
export function replan(graph, v) {
  const mid = v.s > 0 && v.edges.length > 0, from = mid ? v.path[1] : v.path[0];
  const r = reroute(graph, { node: from }, v.destination);
  if (!r) { v.moving = false; v.status = "stuck"; return false; }
  v.path = mid ? [v.path[0], ...r.path] : r.path;
  v.edges = mid ? [v.edges[0], ...r.edges] : r.edges;
  if (v.status === "stuck") { v.status = "dispatched"; v.moving = true; }
  return true;
}

// Call after any road change. Returns { type: "rerouted", delta } | { type: "stuck" } | { type: "resumed" } | null.
export function refresh(graph, v, edge) {
  if (v.status === "stuck") return replan(graph, v) ? { type: "resumed" } : null;
  if (v.status !== "dispatched" || !routeAffected(v, edge)) return null;
  const before = estimate(v, true), same = v.edges.map(e => e.id).join();
  if (!replan(graph, v)) return { type: "stuck" };
  if (v.edges.map(e => e.id).join() === same) return null;              // best route is unchanged: not a reroute
  if (v.moving) v.reroutes++;
  v.delta = estimate(v) - before;                                       // seconds the detour adds
  return { type: "rerouted", delta: v.delta };
}