// src/data/config.js - every tunable number in one place (all are assumptions, edit freely).
export const TRAFFIC_FACTOR = [1, 1.5, 2.5]; // travel-time multiplier for traffic level 0 (clear) / 1 / 2 (heavy)
export const SIREN_FACTOR = 0.85;          // emergency vehicles drive 15% faster than normal traffic
// ---- Fleet, clock and cost (assumptions, edit freely) ----
export const UNITS_PER_STATION = 3;   // units housed at each hospital / fire station / police station
export const SIM_SPEED = 4;           // modelled seconds per real second at 1x (a 5 min route plays in about 75 s)
export const COST_RATES = {           // rupees; an ESTIMATE of fuel + crew time, labelled as such in the UI
  ambulance:  { perKm: 25, perMin: 8 },
  fire_truck: { perKm: 60, perMin: 15 },
  police:     { perKm: 15, perMin: 6 },
};

// ---- Time of day: chance of [clear, moderate, heavy] traffic on a road segment, by road class ----
// Each row sums to 1. A segment's level is picked repeatably (same mode = same traffic), and a road
// the user set by hand with Shift-click is never overwritten.
export const TIME_OF_DAY = {
  offpeak: { label: "Off-peak",     trunk: [0.9, 0.1, 0],   primary: [0.9, 0.1, 0],    secondary: [0.97, 0.03, 0], default: [1, 0, 0] },
  morning: { label: "Morning rush", trunk: [0.1, 0.3, 0.6], primary: [0.15, 0.35, 0.5], secondary: [0.4, 0.4, 0.2],  tertiary: [0.7, 0.25, 0.05], default: [0.97, 0.03, 0] },
  evening: { label: "Evening rush", trunk: [0, 0.2, 0.8],   primary: [0.05, 0.25, 0.7], secondary: [0.25, 0.45, 0.3], tertiary: [0.55, 0.3, 0.15], default: [0.95, 0.05, 0] },
};