// src/data/rules.js
// Rule-based expert system for RESQ-AI.
// Resource counts are simulation assumptions, not official standards.

export const RULES = [
  // SEVERITY INFERENCE
  {
    id: "R1",
    if: () => true,
    then: { severity: "LOW" },
    why: "An incident starts with low severity unless its conditions indicate greater risk"
  },
  {
    id: "R2",
    if: f =>
      f.injured >= 1 ||
      f.peopleInvolved >= 3 ||
      f.type === "fire" ||
      f.type === "building_accident",
    then: { severity: "MEDIUM" },
    why: "Injuries, multiple people involved, fire, or a building accident indicate at least medium severity"
  },
  {
    id: "R3",
    if: f =>
      f.injured >= 3 ||
      (f.fire === true && f.injured >= 1) ||
      (f.type === "building_accident" && f.peopleInvolved >= 5) ||
      (f.hazard === true && f.peopleInvolved >= 3),
    then: { severity: "HIGH" },
    why: "Multiple injuries or a combination of serious incident conditions indicate high severity"
  },

  // PRIORITY INFERENCE
  {
    id: "R4",
    if: f => f.severity === "HIGH",
    then: { priority: "CRITICAL" },
    why: "High-severity incidents require critical priority"
  },
  {
    id: "R5",
    if: f => f.severity === "MEDIUM",
    then: { priority: "HIGH" },
    why: "Medium-severity incidents require high priority"
  },
  {
    id: "R6",
    if: f => f.severity === "LOW",
    then: { priority: "NORMAL" },
    why: "Low-severity incidents receive normal priority"
  },

  // AMBULANCE REQUIREMENTS
  {
    id: "R7",
    if: f => f.injured >= 1 && f.injured <= 2,
    then: { ambulance: 1 },
    why: "One or two injured people require one ambulance"
  },
  {
    id: "R8",
    if: f => f.injured >= 3 && f.injured <= 5,
    then: { ambulance: 2 },
    why: "Three to five injured people require two ambulances"
  },
  {
    id: "R9",
    if: f => f.injured >= 6 && f.injured <= 10,
    then: { ambulance: 3 },
    why: "Six to ten injured people require three ambulances"
  },
  {
    id: "R10",
    if: f => f.injured >= 11,
    then: f => ({
      ambulance: 5 + Math.ceil(Math.max(0, f.injured - 15) / 5)
    }),
    why: "Eleven or more injured people require an expanded ambulance response"
  },
  {
    id: "R11",
    if: f => f.type === "fire" && f.injured === 0,
    then: { ambulance: 1 },
    why: "A fire incident receives a standby ambulance"
  },

  // FIRE TRUCK REQUIREMENTS
  {
    id: "R12",
    if: f => f.type === "fire" || f.fire === true || f.hazard === true,
    then: { fire_truck: 1 },
    why: "A fire or reported hazard requires an initial fire response"
  },
  {
    id: "R13",
    if: f =>
      (f.type === "fire" || f.fire === true || f.hazard === true) &&
      f.severity === "HIGH",
    then: { fire_truck: 2 },
    why: "A high-severity fire or hazard requires two fire trucks"
  },
  {
    id: "R14",
    if: f =>
      (f.type === "fire" || f.fire === true || f.hazard === true) &&
      f.injured >= 11,
    then: { fire_truck: 3 },
    why: "A fire or hazard involving eleven or more injured people requires three fire trucks"
  },

  // POLICE REQUIREMENTS
  {
    id: "R15",
    if: f => f.type === "accident" || f.type === "building_accident",
    then: { police: 1 },
    why: "Accidents require police support for scene and traffic management"
  },
  {
    id: "R16",
    if: f => f.peopleInvolved >= 5,
    then: { police: 2 },
    why: "Incidents involving five or more people require additional police presence"
  },
  {
    id: "R17",
    if: f => f.injured >= 11,
    then: { police: 3 },
    why: "Incidents with eleven or more injured people require three police units"
  },
  {
    id: "R18",
    if: f => f.priority === "CRITICAL",
    then: { police: 2 },
    why: "Critical incidents require additional police presence"
  },
  {
    id: "R19",
    if: f => f.type === "medical_emergency",
    then: { ambulance: 1 },
    why: "A medical emergency always receives at least one ambulance"
  },
  {
    id: "R20",
    if: f => f.type === "building_accident",
    then: { fire_truck: 1 },
    why: "A building accident needs a fire and rescue team for search and rescue"
  }
];