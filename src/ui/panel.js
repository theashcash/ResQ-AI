
// src/ui/panel.js
// Displays inferred incident assessment, resource requirements,
// dispatched vehicles, shortages, and the reasoning trace.

const label = value =>
  String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, char => char.toUpperCase());

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
      <h3>Dispatched units</h3>

      ${
        result.assignments.map(assignment => `
          <div class="unit ${assignment.type}">
            <span class="bar"></span>
            <strong>${assignment.vehicleId}</strong>
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
