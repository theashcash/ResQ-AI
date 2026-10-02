// node scripts/compare.mjs - A* vs Dijkstra on random junction pairs (evidence for the report).
import { readFileSync } from "node:fs";
import { buildGraph } from "../src/engine/graph.js";
import { aStar } from "../src/engine/astar.js";
import { dijkstra } from "../src/engine/baseline.js";

const g = buildGraph(JSON.parse(readFileSync(new URL("../src/data/city.json", import.meta.url))));
const ids = Object.keys(g.nodes); let seed = 7;
const pick = () => ids[(seed = (seed * 1664525 + 1013904223) >>> 0) % ids.length];
let A = 0, D = 0, same = 0; const N = 200;
for (let i = 0; i < N; i++) {
  const s = pick(), t = pick(), a = aStar(g, s, t), d = dijkstra(g, s, t);
  A += a.explored; D += d.explored; same += Math.abs(a.cost - d.cost) < 1e-6;
  if (i < 8) console.log(`${s.padEnd(6)} -> ${t.padEnd(6)}  time ${(a.cost / 60).toFixed(1)} min   explored  A* ${String(a.explored).padStart(5)}   Dijkstra ${String(d.explored).padStart(5)}`);
}
console.log(`\n${N} random pairs: identical route cost in ${same}/${N}`);
console.log(`average nodes explored: A* ${(A / N).toFixed(0)}  vs  Dijkstra ${(D / N).toFixed(0)}  (A* explores ${(100 * (1 - A / D)).toFixed(0)}% fewer)`);