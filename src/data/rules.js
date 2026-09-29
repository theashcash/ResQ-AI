// src/data/rules.js
// Each rule: a condition on the incident facts, and what it concludes.
// `then` values are treated as MINIMUMS — if two rules both set
// ambulance, inference.js keeps the larger number, not the sum.

export const RULES = [
  { id: "R1", if: f => f.type === "accident" && f.injured >= 1,
    then: { ambulance: 1 }, why: "At least one injury needs an ambulance" },

  { id: "R2", if: f => f.injured >= 3,
    then: { ambulance: 2 }, why: "3 or more injured needs two ambulances" },

  { id: "R3", if: f => f.type === "accident",
    then: { police: 1 }, why: "Accidents need traffic control" },

  { id: "R4", if: f => f.fire === true,
    then: { fire_truck: 1 }, why: "Fire present at the scene" },

  { id: "R5", if: f => f.fire === true && f.severity === "high",
    then: { fire_truck: 2 }, why: "High-severity fire needs a larger response" },

  { id: "R6", if: f => f.type === "fire",
    then: { fire_truck: 1, ambulance: 1 }, why: "Any fire call sends a truck and a standby ambulance" },

  { id: "R7", if: f => f.severity === "high" && f.injured >= 3,
    then: { priority: "CRITICAL" }, why: "High severity with multiple injuries" },

  { id: "R8", if: f => f.priority === "CRITICAL",
    then: { police: 2 }, why: "Critical incidents get a larger police presence" },
    // ^ this rule reads a fact ANOTHER rule (R7) writes — this is what
    // makes it forward chaining rather than a single lookup pass.

  { id: "R9", if: f => f.peopleInvolved >= 5 && f.type === "accident",
    then: { police: 2 }, why: "Large incidents need more traffic control" },
];