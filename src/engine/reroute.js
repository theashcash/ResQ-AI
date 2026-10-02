// src/engine/reroute.js
import { aStar } from "./astar.js";

function edgeBetween(edges, a, b) {
  return edges.find(e =>
    (e.from === a && e.to === b) || (e.to === a && e.from === b)
  );
}

export function pathUsesEdge(path, edge) {
  if (!path || path.length < 2) return false;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    if ((edge.from === a && edge.to === b) || (edge.to === a && edge.from === b)) {
      return true;
    }
  }
  return false;
}

// Re-run A* from the vehicle's current node to the same destination.
export function reroute(graph, vehicle, destinationNode) {
  const result = aStar(graph, vehicle.node, destinationNode);
  if (result.path === null) return null;
  return { path: result.path, edges: result.edges, cost: result.cost };
}

// True if any remaining hop is blocked or no longer exists.
export function needsReroute(vehicle, edges) {
  if (!vehicle.path || vehicle.path.length < 2) return false;
  for (let i = 0; i < vehicle.path.length - 1; i++) {
    const edge = edgeBetween(edges, vehicle.path[i], vehicle.path[i + 1]);
    if (!edge || edge.blocked) return true;
  }
  return false;
}
