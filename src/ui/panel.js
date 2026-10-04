// src/ui/panel.js
// Displays inferred incident assessment, resource requirements,
// dispatched vehicles, shortages, and the reasoning trace.

const label = value =>
  String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, char => char.toUpperCase());

import { short } from "./labels.js";
import { tripCost } from "../engine/sim.js";

const rupees = n => `₹${Number(n).toLocaleString("en-IN")}`;
const mins = seconds => `${(seconds / 60).toFixed(1)} min`;

const severityClass = severity =>
  `severity-${String(severity ?? "LOW").toUpperCase()}`;

export function renderResults(container, incident, plan, result, searchNote = "") {
  const needs = Object.entries(plan.needs)
    .filter(([, count]) => count > 0);

  const severity = String(plan.severity ?? "LOW").toUpperCase();
  const priority = String(plan.priority ?? "NORMAL").toUpperCase();

  container.innerHTML = `
    <section class="assessment-panel">
      <div class="res-head">
        <div>
          <p class="eyebrow">AI assessment</p>
          <h2>Recommended response</h2>
        </div>
        <span class="priority p-${priority}">
          ${label(priority)}
        </span>
      </div>

      <p class="incident-type">${label(incident.type)}</p>

      <div class="assessment-grid">
        <div class="assessment-item">
          <span class="assessment-label">Inferred severity</span>
          <strong class="${severityClass(severity)}">
            ${label(severity)}
          </strong>
        </div>

        <div class="assessment-item">
          <span class="assessment-label">Response priority</span>
          <strong class="priority-text">
            ${label(priority)}
          </strong>
        </div>
      </div>

      <p class="assessment-note">
        Severity and priority were inferred automatically from the reported facts.
      </p>
    </section>

    <section class="results-section">
      <h3>Resources required</h3>

      <div class="needs">
        ${
          needs.map(([type, count]) => `
            <div class="need ${type}">
              <b>${count}</b>
              <span>${label(type)}</span>
            </div>
          `).join("")
          || '<p class="muted">No resources required.</p>'
        }
      </div>
    </section>

    <section class="results-section">
      <h3>Units selected</h3>

      ${
        result.assignments.map(assignment => `
          <div class="unit ${assignment.type}">
            <span class="bar"></span>
            <strong>${assignment.vehicleId}</strong>
            <span>${short(assignment.station ?? "")}</span>
            <em title="Estimated travel time">
              ${mins(assignment.cost)}
            </em>
          </div>
        `).join("")
        || '<p class="muted">No units dispatched.</p>'
      }
    </section>

    ${
      result.shortages.length
        ? `
          <section class="shortage results-section">
            <h3>Resource shortages</h3>
            ${
              result.shortages.map(shortage => `
                <p>
                  ${label(shortage.type)}:
                  needed ${shortage.needed},
                  dispatched ${shortage.sent}
                </p>
              `).join("")
            }
          </section>
        `
        : ""
    }

    ${
      searchNote
        ? `
          <section class="results-section">
            <h3>Search comparison</h3>
            <p>${searchNote}</p>
          </section>
        `
        : ""
    }

    <section class="results-section reasoning-section">
      <h3>Inference trace</h3>
      <p class="muted">
        Rules fired by the inference engine to reach its conclusions.
      </p>

      ${
        plan.trace?.length
          ? `
            <ol class="trace">
              ${plan.trace.map(step => `<li>${step}</li>`).join("")}
            </ol>
          `
          : '<p class="muted">No rules fired for these facts.</p>'
      }
    </section>
  `;
}

export function showRerouteEvent(container, vehicleId, cost) {
  const element = document.createElement("div");
  element.className = "reroute-alert";

  const detail = cost == null
    ? `${vehicleId} has no remaining route.`
    : `${vehicleId} is now taking a ${mins(cost)} path.`;

  const heading = document.createElement("h3");
  heading.textContent = "Route changed";
  heading.style.color = "#f4a259";

  const message = document.createElement("p");
  message.textContent = detail;

  element.append(heading, message);
  container.prepend(element);

  setTimeout(() => element.remove(), 5000);
}


// ---- Plan stage: busy-fleet toggle and the Dispatch button (appended under the plan) ----
export function renderPlanActions(container, { shortages, assignments, busy }, onBusy, onDispatch) {
  const box = document.createElement("section");
  box.className = "results-section plan-actions";
  box.innerHTML = `
    <label class="checkbox-label"><input type="checkbox" id="busy" ${busy ? "checked" : ""}>
      <span>Simulate a busy fleet (two of every three units already out)</span></label>
    <button id="dispatch-btn" type="button" class="primary" ${assignments.length ? "" : "disabled"}>
      ${shortages.length ? "Dispatch anyway" : "Dispatch"}</button>`;
  container.append(box);
  box.querySelector("#busy").onchange = e => onBusy(e.target.checked);
  box.querySelector("#dispatch-btn").onclick = onDispatch;
}

// ---- Respond stage: clock controls, one tab per unit, selected unit's card, incident summary ----
export function renderRespond(container, s, h) {
  const u = s.units.find(x => x.id === s.selected) ?? s.units[0];
  const done = s.units.filter(x => x.status === "arrived");
  container.innerHTML = `
    <section class="results-section"><h2>Response in progress</h2>
      <div class="clock">
        <button id="pause" type="button">${s.paused ? "Resume" : "Pause"}</button>
        ${[0.5, 1, 2].map(x => `<button type="button" class="spd ${s.speed === x ? "on" : ""}" data-spd="${x}">${x}x</button>`).join("")}
        <button id="start-all" type="button" class="primary">Start all</button>
      </div></section>
    <section class="results-section">
      <div class="tabs" role="tablist">${s.units.map(x => `
        <button type="button" role="tab" class="tab ${x.type} ${x.id === u.id ? "on" : ""}" data-id="${x.id}" aria-selected="${x.id === u.id}">
          ${x.id}<i class="dot ${x.status}"></i></button>`).join("")}</div>
      <div class="unit-card ${u.type}">
        <h3>${u.id} <span class="muted">from ${short(u.station ?? "")}</span></h3>
        <p class="muted">Estimated travel time ${mins(u.plannedSeconds)}</p>
        <div class="bar-track"><div id="lv-bar"></div></div>
        <p id="lv-status"></p><dl class="stats" id="lv-stats"></dl>
        <button id="start-unit" type="button" class="primary">Start route</button>
      </div></section>
    ${done.length ? `<section class="results-section"><h3>Incident summary</h3>
      <p>${done.length} of ${s.units.length} units have arrived. First arrival after <b>${mins(Math.min(...done.map(x => x.elapsed)))}</b>.
      Total cost so far <b>${rupees(done.reduce((t, x) => t + tripCost(x), 0))}</b> (estimate).</p></section>` : ""}
    <section class="results-section"><button id="new-incident" type="button">New incident</button></section>`;
  const $ = q => container.querySelector(q);
  $("#pause").onclick = h.pause;
  $("#start-all").onclick = h.startAll;
  $("#start-unit").onclick = () => h.start(u.id);
  $("#new-incident").onclick = h.newIncident;
  container.querySelectorAll(".spd").forEach(b => (b.onclick = () => h.speed(Number(b.dataset.spd))));
  container.querySelectorAll(".tab").forEach(b => (b.onclick = () => h.select(b.dataset.id)));
  updateLive(container, u);
}

// Cheap per-frame refresh of the selected unit's numbers (the buttons are not rebuilt, so clicks always land).
export function updateLive(container, u) {
  const $ = q => container.querySelector(q);
  if (!u || !$("#lv-status")) return;
  const done = u.status === "arrived";
  $("#lv-status").textContent = { dispatched: u.moving ? "En route" : "Waiting at the station", arrived: "Arrived",
    stuck: "Stopped: no route available" }[u.status] ?? u.status;
  const left = (u.edges ?? []).reduce((t, e, i) => t + (i === 0 ? e.length - u.s : e.length), 0);
  $("#lv-bar").style.width = `${Math.round((100 * u.distance) / Math.max(1, u.distance + left))}%`;
  $("#lv-stats").innerHTML = u.elapsed ? `
    <div><dt>${done ? "Time taken" : "Elapsed"}</dt><dd>${mins(u.elapsed)}</dd></div>
    <div><dt>Distance</dt><dd>${(u.distance / 1000).toFixed(2)} km</dd></div>
    <div><dt>${done ? "Cost (estimate)" : "Cost so far"}</dt><dd>${rupees(tripCost(u))}</dd></div>
    <div><dt>Reroutes</dt><dd>${u.reroutes}${u.reroutes ? ` (${u.delta >= 0 ? "+" : ""}${(u.delta / 60).toFixed(1)} min)` : ""}</dd></div>` : "";
  const b = $("#start-unit");
  b.disabled = !(u.status === "dispatched" && !u.moving);
  b.textContent = u.moving ? "Running" : done ? "Arrived" : "Start route";
}

export function showToast(container, title, text) {
  const el = document.createElement("div");
  el.className = "reroute-alert";
  el.innerHTML = `<h3 style="color:#f4a259"></h3><p></p>`;
  el.querySelector("h3").textContent = title;
  el.querySelector("p").textContent = text;
  container.prepend(el);
  setTimeout(() => el.remove(), 6000);
}