// ==========================================
// RESQ-AI CITY GRAPH
// ==========================================

// Each node represents an intersection/location.
//
// x and y are used later to draw the node on
// our SVG map.

export const NODES = {
    A: { x: 100, y: 100, name: "North West" },
    B: { x: 300, y: 100, name: "North" },
    C: { x: 500, y: 100, name: "North East" },

    D: { x: 100, y: 300, name: "West" },
    E: { x: 300, y: 300, name: "Central" },
    F: { x: 500, y: 300, name: "East" },

    G: { x: 100, y: 500, name: "South West" },
    H: { x: 300, y: 500, name: "South" },
    I: { x: 500, y: 500, name: "South East" },

    J: { x: 700, y: 300, name: "Hospital" }
};


// ==========================================
// ROAD / EDGE DATA
// ==========================================
//
// dist     → physical distance
// traffic  → traffic multiplier
// blocked  → whether the road is unavailable
//
// traffic values:
// 0 = normal
// 1 = medium
// 2 = heavy

export const EDGES = [
    { from: "A", to: "B", dist: 200, traffic: 0, blocked: false },
    { from: "B", to: "C", dist: 200, traffic: 0, blocked: false },

    { from: "A", to: "D", dist: 200, traffic: 0, blocked: false },
    { from: "B", to: "E", dist: 200, traffic: 1, blocked: false },
    { from: "C", to: "F", dist: 200, traffic: 0, blocked: false },

    { from: "D", to: "E", dist: 200, traffic: 0, blocked: false },
    { from: "E", to: "F", dist: 200, traffic: 2, blocked: false },

    { from: "D", to: "G", dist: 200, traffic: 0, blocked: false },
    { from: "E", to: "H", dist: 200, traffic: 0, blocked: false },
    { from: "F", to: "I", dist: 200, traffic: 0, blocked: false },

    { from: "G", to: "H", dist: 200, traffic: 0, blocked: false },
    { from: "H", to: "I", dist: 200, traffic: 0, blocked: false },

    { from: "F", to: "J", dist: 200, traffic: 0, blocked: false },
    { from: "I", to: "J", dist: 250, traffic: 1, blocked: false }
];


// ==========================================
// EMERGENCY STATIONS
// ==========================================

export const STATIONS = {
    hospital: ["J"],

    fire_station: ["A"],

    police_station: ["C"]
};