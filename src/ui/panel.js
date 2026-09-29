// src/ui/panel.js  (results panel: no emojis, sentence case)
const label = t => t.replace("_", " ").replace(/^\w/, c => c.toUpperCase());
const chips = p => p.map(n => `<span class="chip">${n}</span>`).join('<span class="sep">&rsaquo;</span>');

export function renderResults(container, incident, plan, result) {
    const needs = Object.entries(plan.needs).filter(([, n]) => n > 0);
    container.innerHTML = `
        <div class="res-head"><h2>Recommended response</h2>
            <span class="priority p-${plan.priority}">${label(plan.priority.toLowerCase())}</span></div>
        <section><h3>Resources required</h3><div class="needs">${
            needs.map(([t, n]) => `<div class="need ${t}"><b>${n}</b><span>${label(t)}</span></div>`).join("")
            || '<p class="muted">None</p>'}</div></section>
        <section><h3>Dispatched units</h3>${
            result.assignments.map(a => `<div class="unit ${a.type}"><span class="bar"></span>
                <strong>${a.vehicleId}</strong><span>${chips(a.path)}</span><em title="Route cost">${a.cost.toFixed(0)}</em></div>`).join("")
            || '<p class="muted">No units dispatched</p>'}</section>
        ${result.shortages.length ? `<section class="shortage"><h3>Not enough units available</h3>${
            result.shortages.map(s => `<p>${label(s.type)}: needed ${s.needed}, sent ${s.sent}</p>`).join("")}</section>` : ""}
        <section><h3>Why the system chose this</h3><ol class="trace">${
            plan.trace.map(t => `<li>${t}</li>`).join("")}</ol></section>`;
}

export function showRerouteEvent(container, vehicleId, newPath) {
    const el = document.createElement("div");
    el.className = "reroute-alert";
    el.innerHTML = `<h3 style="color:#f4a259">Route changed</h3>${vehicleId} is now taking ${chips(newPath)}`;
    container.prepend(el);
    setTimeout(() => el.remove(), 5000);
}