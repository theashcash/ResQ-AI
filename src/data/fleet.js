// src/data/fleet.js - builds the fleet from the facilities in city.json, so it never goes stale if the map is re-exported.
import { UNITS_PER_STATION } from "./config.js";
const KIND = { hospital: ["ambulance", "AMB"], fire_station: ["fire_truck", "FIRE"], police: ["police", "POL"] };

export function buildFleet(facilities) {
  const fleet = [], n = {};
  for (const f of facilities) {
    const [type, tag] = KIND[f.type] ?? [];
    if (!type) continue;
    for (let slot = 0; slot < UNITS_PER_STATION; slot++) {
      n[tag] = (n[tag] ?? 0) + 1;
      fleet.push({ id: `${tag}${n[tag]}`, type, station: f.name, slot, node: f.node, home: f.node,
        status: "available", path: null, edges: null, destination: null, moving: false, s: 0 });
    }
  }
  return fleet;
}

// "Busy fleet" demo toggle: two of every three units at each station are already out on other calls.
export function setBusy(fleet, on) {
  for (const v of fleet) {
    if (on && v.status === "available" && v.slot > 0) v.status = "busy";
    if (!on && v.status === "busy") v.status = "available";
  }
}