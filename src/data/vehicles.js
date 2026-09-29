// src/data/vehicles.js

// Each vehicle: which station it starts at, its type, and current status.
// status: "available" | "dispatched"

export const VEHICLES = [
    { id: "AMB1", type: "ambulance",  node: "J", status: "available" },
    { id: "AMB2", type: "ambulance",  node: "J", status: "available" },

    { id: "FIRE1", type: "fire_truck", node: "A", status: "available" },
    { id: "FIRE2", type: "fire_truck", node: "A", status: "available" },

    { id: "POL1", type: "police",     node: "C", status: "available" },
    { id: "POL2", type: "police",     node: "C", status: "available" },
];