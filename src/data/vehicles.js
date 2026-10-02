
// src/data/vehicles.js
// One simulated ambulance per hospital.
// Vehicle locations use the hospital nodes in city.json.

export const VEHICLES = [
  {
    id: "AMB1",
    type: "ambulance",
    node: "n417",
    home: "n417",
    status: "available",
    path: null,
    edges: null,
    destination: null
  },
  {
    id: "AMB2",
    type: "ambulance",
    node: "n3",
    home: "n3",
    status: "available",
    path: null,
    edges: null,
    destination: null
  },
  {
    id: "AMB3",
    type: "ambulance",
    node: "n2245",
    home: "n2245",
    status: "available",
    path: null,
    edges: null,
    destination: null
  },
  {
    id: "AMB4",
    type: "ambulance",
    node: "n1641",
    home: "n1641",
    status: "available",
    path: null,
    edges: null,
    destination: null
  },
  {
    id: "AMB5",
    type: "ambulance",
    node: "n1581",
    home: "n1581",
    status: "available",
    path: null,
    edges: null,
    destination: null
  },
  {
    id: "FIRE1",
    type: "fire_truck",
    node: "n1558",
    home: "n1558",
    status: "available",
    path: null,
    edges: null,
    destination: null
  },
  {
    id: "FIRE2",
    type: "fire_truck",
    node: "n315",
    home: "n315",
    status: "available",
    path: null,
    edges: null,
    destination: null
  },
  {
    id: "POL1",
    type: "police",
    node: "n173",
    home: "n173",
    status: "available",
    path: null,
    edges: null,
    destination: null
  },
  {
    id: "POL2",
    type: "police",
    node: "n4212",
    home: "n4212",
    status: "available",
    path: null,
    edges: null,
    destination: null
  },
  {
    id: "POL3",
    type: "police",
    node: "n326",
    home: "n326",
    status: "available",
    path: null,
    edges: null,
    destination: null
  }
];
