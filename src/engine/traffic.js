// src/engine/traffic.js - time-of-day traffic: a repeatable pseudo-random congestion level per road segment.
import { TIME_OF_DAY } from "../data/config.js";

// FNV-1a hash -> a repeatable number in [0, 1), so the same segment and mode always get the same traffic.
function unit(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

// Traffic level 0 (clear), 1 (moderate) or 2 (heavy) for one segment in one mode.
// Segments of the same named road usually share a draw (3 in 4), so congestion shows up as realistic stretches, not confetti.
export function trafficFor(edge, mode) {
  const t = TIME_OF_DAY[mode], p = t[edge.road] ?? t.default;
  const r = edge.name && unit(`${edge.name}:${mode}:share`) < 0.75 ? unit(`${edge.name}:${mode}`) : unit(`${edge.id}:${mode}`);
  return r < p[0] ? 0 : r < p[0] + p[1] ? 1 : 2;
}

// Paints the mode onto every segment the user has not set by hand. Returns the Set of segments that changed.
export function applyTimeOfDay(graph, mode) {
  const changed = new Set();
  for (const e of graph.edges) {
    if (e.userSet) continue;
    const level = trafficFor(e, mode);
    if (level !== e.traffic) { e.traffic = level; changed.add(e); }
  }
  return changed;
}