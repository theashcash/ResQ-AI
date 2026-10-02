// src/engine/inference.js
import { RULES } from "../data/rules.js";

const RESOURCE_KEYS = ["ambulance", "police", "fire_truck"];

export function inferResources(incident) {
  const facts = { ...incident };

  const needs = {
    ambulance: 0,
    police: 0,
    fire_truck: 0
  };

  const trace = [];
  const fired = new Set();

  let changed = true;

  while (changed) {
    changed = false;

    for (const rule of RULES) {
      if (fired.has(rule.id)) continue;
      if (!rule.if(facts)) continue;

      fired.add(rule.id);
      changed = true;

      trace.push(`${rule.id} fired: ${rule.why}`);

      const conclusions =
        typeof rule.then === "function"
          ? rule.then(facts)
          : rule.then;

      for (const [key, value] of Object.entries(conclusions)) {
        if (key === "severity" || key === "priority") {
          facts[key] = value;
        } else if (RESOURCE_KEYS.includes(key)) {
          needs[key] = Math.max(
            needs[key],
            Number(value) || 0
          );

          facts[key] = needs[key];
        }
      }
    }
  }

  return {
    needs,
    severity: facts.severity ?? "LOW",
    priority: facts.priority ?? "NORMAL",
    trace
  };
}