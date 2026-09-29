// src/engine/dispatch.js

import { aStar } from "./astar.js";
import { VEHICLES } from "../data/vehicles.js";


// ==========================================
// Dispatch vehicles to an incident
// ==========================================
//
// Takes the `needs` object from inferResources()
// (e.g. { ambulance: 2, police: 1, fire_truck: 1 })
// and the incident's node, and decides which actual
// vehicles to send.
//
// For each vehicle type:
//   1. find available vehicles of that type
//   2. run A* from each one to the incident
//   3. send the cheapest N, where N = needs[type]
//
// Returns the chosen assignments and any shortages
// (needed but not available).

export function dispatch(needs, incidentNode) {

    const assignments = [];
    const shortages = [];

    for (const [type, count] of Object.entries(needs)) {

        if (count <= 0) continue;

        // Step 1: candidates of the right type, currently free
        const candidates = VEHICLES.filter(
            v => v.type === type && v.status === "available"
        );

        // Step 2: route each candidate to the incident
        const scored = candidates.map(v => {
            const result = aStar(v.node, incidentNode);
            return { vehicle: v, path: result.path, cost: result.cost };
        });

        // Drop any that can't reach the incident at all
        const reachable = scored.filter(s => s.path !== null);

        // Step 3: cheapest routes first
        reachable.sort((a, b) => a.cost - b.cost);

        const chosen = reachable.slice(0, count);

        for (const c of chosen) {
            c.vehicle.status = "dispatched";
            // Give the actual vehicle its route
            c.vehicle.path = [...c.path];
            assignments.push({
                vehicleId: c.vehicle.id,
                type: c.vehicle.type,
                path: c.path,
                cost: c.cost
            });
        }

        // Not enough available units of this type
        if (chosen.length < count) {
            shortages.push({
                type: type,
                needed: count,
                sent: chosen.length,
                missing: count - chosen.length,
            });
        }
    }

    return { assignments, shortages };
}