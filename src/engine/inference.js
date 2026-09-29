// src/engine/inference.js
import { RULES } from "../data/rules.js";

// Forward chaining: repeatedly scan the rules and fire any whose
// condition now matches the working facts, until a full pass fires
// nothing new. This lets a rule's conclusion (e.g. priority = CRITICAL)
// become a fact that a later rule's condition can read (see R8).
export function inferResources(incident) {
  const facts = { ...incident };          // working memory, starts as the input
  const needs = { ambulance: 0, police: 0, fire_truck: 0 };
  const trace = [];                       // human-readable reasoning, for the demo/report
  const fired = new Set();                // each rule fires at most once

  let changed = true;
  while (changed) {
    changed = false;
    for (const rule of RULES) {
      if (fired.has(rule.id)) continue;
      if (!rule.if(facts)) continue;

      fired.add(rule.id);
      changed = true;
      trace.push(`${rule.id} fired: ${rule.why}`);

      for (const [key, value] of Object.entries(rule.then)) {
        if (key === "priority") {
          facts.priority = value;         // write back so later rules (R8) can read it
        } else {
          needs[key] = Math.max(needs[key] ?? 0, value);
          facts[key] = needs[key];        // also visible to later rule conditions if needed
        }
      }
    }
  }

  return { needs, priority: facts.priority ?? "MEDIUM", trace };
}