// src/engine/dispatch.js

import { aStar } from "./astar.js";

// Calculate the cheapest available vehicle assignments
// without modifying the fleet.
export function previewDispatch(graph, needs, incidentNode, vehicles) {
  const assignments = [];
  const shortages = [];
  const reserved = new Set();

  for (const [type, count] of Object.entries(needs)) {
    if (count <= 0) continue;

    const scored = vehicles
      .filter(
        (vehicle) =>
          vehicle.type === type &&
          vehicle.status === "available" &&
          !reserved.has(vehicle.id)
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
      reserved.add(vehicle.id);

      assignments.push({
        vehicleId: vehicle.id,
        type: vehicle.type,
        from: vehicle.node,
        path: [...candidate.path],
        edges: [...candidate.edges],
        cost: candidate.cost,
        explored: candidate.explored
      });
    }

    console.table(
      scored.map((candidate) => ({
        vehicle: candidate.vehicle.id,
        start: candidate.vehicle.node,
        cost: candidate.cost,
        reachable: candidate.path !== null
      }))
    );

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
    shortages,
    incidentNode
  };
}

// Apply a previously reviewed plan to the fleet.
export function confirmDispatch(plan, vehicles) {
  const assignments = [];
  const shortages = [...plan.shortages];

  for (const proposed of plan.assignments) {
    const vehicle = vehicles.find(
      (v) => v.id === proposed.vehicleId
    );

    // Ensure the vehicle has not changed since preview.
    if (
      !vehicle ||
      vehicle.status !== "available" ||
      vehicle.node !== proposed.from
    ) {
      let shortage = shortages.find(
        (s) => s.type === proposed.type
      );

      if (!shortage) {
        shortage = {
          type: proposed.type,
          needed: 0,
          sent: 0,
          missing: 0
        };
        shortages.push(shortage);
      }

      shortage.needed += 1;
      shortage.missing += 1;
      continue;
    }

    vehicle.status = "dispatched";
    vehicle.path = [...proposed.path];
    vehicle.edges = [...proposed.edges];
    vehicle.destination = plan.incidentNode;

    assignments.push(proposed);
  }

  return {
    assignments,
    shortages
  };
}

// Keep the original immediate-dispatch API.
// Existing main.js can continue using this function.
export function dispatch(graph, needs, incidentNode, vehicles) {
  const plan = previewDispatch(
    graph,
    needs,
    incidentNode,
    vehicles
  );

  return confirmDispatch(plan, vehicles);
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
}

// Reset every vehicle to its initial state.
export function resetAllVehicles(vehicles) {
  for (const vehicle of vehicles) {
    vehicle.status = "available";
    vehicle.node = vehicle.home;
    vehicle.path = null;
    vehicle.edges = null;
    vehicle.destination = null;
  }
}