// src/engine/baseline.js - Dijkstra = the same search with h(n) = 0. The fair baseline for A*.
import { search } from "./astar.js";
export const dijkstra = (graph, start, goal) => search(graph, start, goal, false);