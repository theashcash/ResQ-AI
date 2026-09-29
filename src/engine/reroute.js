// src/engine/reroute.js

import { aStar } from "./astar.js";


// ==========================================
// Reroute a vehicle mid-journey
// ==========================================
//
// Called when the environment changes (a road on the
// vehicle's remaining path becomes blocked or its
// traffic gets worse). Re-runs A* from the vehicle's
// CURRENT node — not the original start — to the
// same destination.
//
// `vehicle` needs { node, path } where `node` is where
// it is right now and `path` is the route it was following.
// Returns a new { path, cost }, or null if no route exists.

export function reroute(vehicle, destinationNode) {

    const result = aStar(vehicle.node, destinationNode);

    if (result.path === null) {
        // No route at all — vehicle is stuck, caller should
        // decide what to do (report it, try a different vehicle, etc.)
        return null;
    }

    return {
        path: result.path,
        cost: result.cost,
    };
}


// ==========================================
// Check whether a vehicle's current path is still valid
// ==========================================
//
// Call this whenever the graph changes. It looks at the
// NEXT edge the vehicle is about to travel and checks if
// it's now blocked. Doesn't check the whole path — only
// the immediate next step, since that's the only one that
// matters right now (the road could change again later).

export function needsReroute(vehicle, EDGES) {

    if (!vehicle.path || vehicle.path.length < 2) {
        return false; // already arrived, or no path
    }

    const nextNode = vehicle.path[1];

    const edge = EDGES.find(e =>
        (e.from === vehicle.node && e.to === nextNode) ||
        (e.to === vehicle.node && e.from === nextNode)
    );

    return edge ? edge.blocked : true; // treat a missing edge as unsafe too
}