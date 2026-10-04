// src/engine/dispatch.js

import { aStar } from "./astar.js";
import { initRun } from "./sim.js";

// Dispatch the cheapest available vehicles of each required type.
// Shortfalls are reported if there are not enough reachable vehicles.
// commit=false only previews the plan (nothing is marked busy); commit=true sends the units.
export function dispatch(graph, needs, incidentNode, vehicles, commit = true) {
  const assignments = [];
  const shortages = [];

  for (const [type, count] of Object.entries(needs)) {
    if (count <= 0) continue;

    const scored = vehicles
      .filter(
        (vehicle) =>
          vehicle.type === type &&
          vehicle.status === "available"
      )
      .map((vehicle) => {
        const result = aStar(
          graph,
          vehicle.node,
          incidentNode
        );

        return { vehicle, ...result };
      });

    const reachable = scored
      .filter((candidate) => candidate.path !== null)
      .sort((a, b) => a.cost - b.cost);

    const chosen = reachable.slice(0, count);

    for (const candidate of chosen) {
      const vehicle = candidate.vehicle;

      if (commit) {
        vehicle.status = "dispatched";
        vehicle.path = [...candidate.path];
        vehicle.edges = [...candidate.edges];
        vehicle.destination = incidentNode;
        initRun(vehicle, candidate.cost);
      }

      assignments.push({
        vehicleId: vehicle.id,
        type: vehicle.type,
        station: vehicle.station,
        from: vehicle.node,
        path: [...candidate.path],
        edges: [...candidate.edges],
        cost: candidate.cost,
        explored: candidate.explored,
      });
    }
    if (chosen.length < count) {
      shortages.push({
        type,
        needed: count,
        sent: chosen.length,
        missing: count - chosen.length,
      });
    }
  }

  return { assignments, shortages };
}

// Release a dispatched vehicle and return it to its home node.
export function releaseVehicle(vehicles, vehicleId) {
  const vehicle = vehicles.find(
    (v) => v.id === vehicleId
  );

  if (!vehicle) return;

  vehicle.status = "available";
  vehicle.node = vehicle.home;
  vehicle.path = null;
  vehicle.edges = null;
  vehicle.destination = null;
  vehicle.moving = false;
  vehicle.s = 0;
}

// Reset every vehicle to its initial state.
export function resetAllVehicles(vehicles) {
  for (const vehicle of vehicles) {
    vehicle.status = "available";
    vehicle.node = vehicle.home;
    vehicle.path = null;
    vehicle.edges = null;
    vehicle.destination = null;
    vehicle.moving = false;
    vehicle.s = 0;
  }
}