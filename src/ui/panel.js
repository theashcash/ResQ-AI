// src/ui/panel.js  (results panel: no emojis, sentence case)
const label = t => t.replace("_", " ").replace(/^\w/, c => c.toUpperCase());
const mins = s => `${(s / 60).toFixed(1)} min`;

export function renderResults(container, incident, plan, result, searchNote = "") {
  const needs = Object.entries(plan.needs).filter(([, n]) => n > 0);
  container.innerHTML = `
    <div class="res-head"><h2>Recommended response</h2>
      <span class="priority p-${plan.priority}">${label(plan.priority.toLowerCase())}</span></div>
    <p class="muted">${label(incident.type)} · ${incident.severity} severity</p>
    <section><h3>Resources required</h3><div class="needs">${
      needs.map(([t, n]) => `<div class="need ${t}"><b>${n}</b><span>${label(t)}</span></div>`).join("")
      || '<p class="muted">None</p>'}</div></section>
    <section><h3>Dispatched units</h3>${
      result.assignments.map(a => `<div class="unit ${a.type}"><span class="bar"></span>
        <strong>${a.vehicleId}</strong><span>${a.path.length - 1} junctions</span>
        <em title="Estimated travel time">${mins(a.cost)}</em></div>`).join("")
      || '<p class="muted">No units dispatched</p>'}</section>
    ${result.shortages.length ? `<section class="shortage"><h3>Not enough units available</h3>${
      result.shortages.map(s => `<p>${label(s.type)}: needed ${s.needed}, sent ${s.sent}</p>`).join("")}</section>` : ""}
    ${searchNote ? `<section><h3>Search comparison</h3><p>${searchNote}</p></section>` : ""}
    <section><h3>Why the system chose this</h3>${
      plan.trace.length
        ? `<ol class="trace">${plan.trace.map(t => `<li>${t}</li>`).join("")}</ol>`
        : '<p class="muted">No rules fired for these facts.</p>'}</section>`;
}

export function showRerouteEvent(container, vehicleId, cost) {
  const el = document.createElement("div");
  el.className = "reroute-alert";
  const detail = cost == null
    ? `${vehicleId} has no remaining route.`
    : `${vehicleId} is now taking a ${mins(cost)} path.`;
  el.innerHTML = `<h3 style="color:#f4a259">Route changed</h3>${detail}`;
  container.prepend(el);
  setTimeout(() => el.remove(), 5000);
}
