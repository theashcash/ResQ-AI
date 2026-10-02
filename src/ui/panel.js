// src/ui/panel.js
// Displays incident assessment, dispatch plan review,
// fleet status, dispatch results, and reroute alerts.

const label = value =>
  String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, char => char.toUpperCase());

const mins = seconds =>
  `${(seconds / 60).toFixed(1)} min`;

const severityClass = severity =>
  `severity-${String(severity ?? "LOW").toUpperCase()}`;

const escapeHTML = value =>
  String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

// ========================================
// FLEET DASHBOARD
// ========================================

export function renderFleetDashboard(container, fleet = []) {
  const counts = {
    available: 0,
    dispatched: 0,
    arrived: 0,
    stuck: 0
  };

  fleet.forEach(vehicle => {
    const status = String(vehicle.status ?? "available").toLowerCase();

    if (status in counts) {
      counts[status]++;
    }
  });

  container.innerHTML = `
    <section class="results-section fleet-dashboard">
      <div class="res-head">
        <div>
          <p class="eyebrow">Fleet overview</p>
          <h2>Emergency units</h2>
        </div>
        <span class="fleet-total">${fleet.length} units</span>
      </div>

      <div class="fleet-summary">
        <div class="fleet-stat">
          <strong>${counts.available}</strong>
          <span>Available</span>
        </div>

        <div class="fleet-stat">
          <strong>${counts.dispatched}</strong>
          <span>En route</span>
        </div>

        <div class="fleet-stat">
          <strong>${counts.arrived}</strong>
          <span>Arrived</span>
        </div>

        <div class="fleet-stat">
          <strong>${counts.stuck}</strong>
          <span>Stuck</span>
        </div>
      </div>

      <div class="fleet-list">
        ${
          fleet.map(vehicle => `
            <div class="fleet-unit ${escapeHTML(vehicle.type)}">
              <div>
                <strong>${escapeHTML(vehicle.id)}</strong>
                <span>${label(vehicle.type)}</span>
              </div>

              <span class="fleet-status status-${escapeHTML(vehicle.status)}">
                ${label(vehicle.status)}
              </span>
            </div>
          `).join("")
          || '<p class="muted">No vehicles registered.</p>'
        }
      </div>
    </section>
  `;
}

// ========================================
// PLAN REVIEW
// ========================================

export function renderPlanReview(container, incident, plan, preview) {
  const needs = Object.entries(plan.needs ?? {})
    .filter(([, count]) => count > 0);

  const assignments = preview.assignments ?? [];
  const shortages = preview.shortages ?? [];

  const severity = String(plan.severity ?? "LOW").toUpperCase();
  const priority = String(plan.priority ?? "NORMAL").toUpperCase();

  container.innerHTML = `
    <section class="assessment-panel">
      <div class="res-head">
        <div>
          <p class="eyebrow">AI assessment</p>
          <h2>Proposed response</h2>
        </div>

        <span class="priority p-${escapeHTML(priority)}">
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
        Review the proposed units before dispatching them.
      </p>
    </section>

    <section class="results-section">
      <h3>Required resources</h3>

      <div class="needs">
        ${
          needs.map(([type, count]) => `
            <div class="need ${escapeHTML(type)}">
              <b>${count}</b>
              <span>${label(type)}</span>
            </div>
          `).join("")
          || '<p class="muted">No resources required.</p>'
        }
      </div>
    </section>

    <section class="results-section">
      <h3>Proposed assignments</h3>

      ${
        assignments.map(assignment => `
          <div class="unit ${escapeHTML(assignment.type)}">
            <span class="bar"></span>

            <strong>${escapeHTML(assignment.vehicleId)}</strong>

            <span>
              ${(assignment.path?.length ?? 1) - 1} junctions
            </span>

            <em title="Estimated travel time">
              ${mins(assignment.cost)}
            </em>
          </div>
        `).join("")
        || '<p class="muted">No units can be assigned.</p>'
      }
    </section>

    ${
      shortages.length
        ? `
          <section class="shortage results-section">
            <h3>Resource shortages</h3>

            ${
              shortages.map(shortage => `
                <p>
                  ${label(shortage.type)}:
                  needed ${shortage.needed},
                  available ${shortage.sent}
                </p>
              `).join("")
            }
          </section>
        `
        : `
          <section class="results-section">
            <p class="muted">
              All requested resources have a proposed assignment.
            </p>
          </section>
        `
    }

    <section class="results-section reasoning-section">
      <h3>Inference trace</h3>

      <p class="muted">
        Rules fired by the inference engine.
      </p>

      ${
        plan.trace?.length
          ? `
            <ol class="trace">
              ${plan.trace.map(step => `
                <li>${escapeHTML(step)}</li>
              `).join("")}
            </ol>
          `
          : '<p class="muted">No rules fired for these facts.</p>'
      }
    </section>

    <div class="plan-actions">
      <button id="confirm-dispatch" class="primary-button">
        Confirm dispatch
      </button>

      <button id="cancel-plan" class="secondary-button">
        Cancel
      </button>
    </div>
  `;
}

// ========================================
// DISPATCH RESULTS
// ========================================

export function renderResults(
  container,
  incident,
  plan,
  result,
  searchNote = ""
) {
  const needs = Object.entries(plan.needs ?? {})
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

        <span class="priority p-${escapeHTML(priority)}">
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
            <div class="need ${escapeHTML(type)}">
              <b>${count}</b>
              <span>${label(type)}</span>
            </div>
          `).join("")
          || '<p class="muted">No resources required.</p>'
        }
      </div>
    </section>

    <section class="results-section">
      <h3>Dispatched units</h3>

      ${
        result.assignments.map(assignment => `
          <div class="unit ${escapeHTML(assignment.type)}">
            <span class="bar"></span>
            <strong>${escapeHTML(assignment.vehicleId)}</strong>
            <span>${assignment.path.length - 1} junctions</span>
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
            <p>${escapeHTML(searchNote)}</p>
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
              ${plan.trace.map(step => `
                <li>${escapeHTML(step)}</li>
              `).join("")}
            </ol>
          `
          : '<p class="muted">No rules fired for these facts.</p>'
      }
    </section>
  `;
}

// ========================================
// REROUTE ALERT
// ========================================

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