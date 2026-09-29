// src/engine/dispatch.js

import { aStar } from "./astar.js";
import { VEHICLES } from "../data/vehicles.js";


// ==========================================
// Dispatch vehicles to an incident
// ==========================================
//
// Takes the `needs` object from inferResources()
// and the incident's node.
//
// Example:
// {
//     ambulance: 2,
//     police: 1,
//     fire_truck: 1
// }
//
// For each vehicle type:
//   1. Find available vehicles.
//   2. Calculate an A* route for each.
//   3. Remove unreachable vehicles.
//   4. Sort by route cost.
//   5. Dispatch the cheapest required vehicles.
//
// Returns:
// {
//     assignments: [...],
//     shortages: [...]
// }
// ==========================================

export function dispatch(needs, incidentNode) {

    const assignments = [];
    const shortages = [];

    for (const [type, count] of Object.entries(needs)) {

        if (count <= 0) {
            continue;
        }


        // ======================================
        // 1. Find available vehicles
        // ======================================

        const candidates = VEHICLES.filter(
            vehicle =>
                vehicle.type === type &&
                vehicle.status === "available"
        );


        // ======================================
        // 2. Calculate route for each vehicle
        // ======================================

        const scored = candidates.map(vehicle => {

            const result = aStar(
                vehicle.node,
                incidentNode
            );

            return {
                vehicle,
                path: result.path,
                cost: result.cost
            };
        });


        // ======================================
        // 3. Remove unreachable vehicles
        // ======================================

        const reachable = scored.filter(
            candidate => candidate.path !== null
        );


        // ======================================
        // 4. Cheapest routes first
        // ======================================

        reachable.sort(
            (a, b) => a.cost - b.cost
        );


        // ======================================
        // 5. Select required number
        // ======================================

        const chosen = reachable.slice(
            0,
            count
        );


        // ======================================
        // 6. Dispatch selected vehicles
        // ======================================

        for (const candidate of chosen) {

            candidate.vehicle.status = "dispatched";

            // Store the route directly on the
            // actual vehicle object.

            candidate.vehicle.path = [
                ...candidate.path
            ];

            assignments.push({
                vehicleId: candidate.vehicle.id,
                type: candidate.vehicle.type,
                path: [...candidate.path],
                cost: candidate.cost
            });
        }


        // ======================================
        // 7. Record shortages
        // ======================================

        if (chosen.length < count) {

            shortages.push({
                type,
                needed: count,
                sent: chosen.length,
                missing: count - chosen.length
            });
        }
    }


    return {
        assignments,
        shortages
    };
}


// ==========================================
// Release one vehicle
// ==========================================
//
// Called when a vehicle finishes its job.
// It becomes available for future incidents.
// ==========================================

export function releaseVehicle(vehicleId) {

    const vehicle = VEHICLES.find(
        vehicle => vehicle.id === vehicleId
    );

    if (!vehicle) {
        return;
    }

    vehicle.status = "available";
    vehicle.path = null;
}


// ==========================================
// Reset entire fleet
// ==========================================
//
// Useful for:
// - Reset Simulation button
// - Testing
// - Running multiple incidents
// ==========================================

export function resetAllVehicles() {

    for (const vehicle of VEHICLES) {

        vehicle.status = "available";
        vehicle.path = null;
    }
}