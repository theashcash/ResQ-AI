
// src/ui/controls.js
// Builds the incident form. The inference engine derives severity
// and priority from the facts collected here.

export function renderIncidentForm(container, onSubmit) {
  container.innerHTML = `
    <div class="form-heading">
      <h2>Report incident</h2>
      <p class="muted">Enter the incident details to generate a response plan.</p>
    </div>

    <form id="incident-form">
      <label for="incident-type">Incident type</label>
      <select name="type" id="incident-type" required>
        <option value="accident">Road accident</option>
        <option value="fire">Fire</option>
        <option value="building_accident">Building accident</option>
        <option value="medical_emergency">Medical emergency</option>
      </select>

      <label for="people-involved">People involved</label>
      <input
        type="number"
        id="people-involved"
        name="peopleInvolved"
        min="0"
        step="1"
        value="1"
        required
      >

      <label for="injured">Number of injured people</label>
      <input
        type="number"
        id="injured"
        name="injured"
        min="0"
        step="1"
        value="0"
        required
      >

      <label class="checkbox-label" for="hazard">
        <input type="checkbox" name="hazard" id="hazard">
        <span>Fire or other hazard present</span>
      </label>

      <p class="form-note">
        Severity and priority are calculated automatically from these details.
      </p>

      <div class="location-field">
        <span class="field-title">Incident location</span>
        <p id="incident-location" class="muted">
          Click the map to set the location.
        </p>
        <input type="hidden" name="node" id="incident-node">
      </div>

      <button type="submit">Generate response plan</button>
    </form>
  `;

  const form = container.querySelector("#incident-form");

  form.addEventListener("submit", event => {
    event.preventDefault();

    const data = new FormData(form);

    const type = data.get("type");
    const peopleInvolved = Number(data.get("peopleInvolved"));
    const injured = Number(data.get("injured"));
    const hazard = data.get("hazard") === "on";

    if (
      !Number.isInteger(peopleInvolved) ||
      !Number.isInteger(injured) ||
      peopleInvolved < 0 ||
      injured < 0
    ) {
      alert("Enter valid non-negative whole numbers.");
      return;
    }

    if (injured > peopleInvolved) {
      alert("The number of injured people cannot exceed the number involved.");
      return;
    }

    const incident = {
      type,
      peopleInvolved,
      injured,
      fire: type === "fire" || hazard,
      hazard,
      node: data.get("node") || null
    };

    onSubmit(incident);
  });
}

export function setIncidentLocation(nodeId) {
  const hidden = document.getElementById("incident-node");
  const label = document.getElementById("incident-location");

  if (hidden) hidden.value = nodeId || "";

  if (label) {
    label.textContent = nodeId
      ? `Location pinned near junction ${nodeId}.`
      : "Click the map to set the location.";
  }
}

export function renderEdgeControls(container, edge, onChange) {
  const name = edge.name || "Unnamed road";

  container.innerHTML = `
    <h3>${name}</h3>

    <p class="muted">
      ${Math.round(edge.length)} m · ${edge.road}
      ${edge.oneway ? " · one-way (treated as two-way)" : ""}
    </p>

    <label for="edge-traffic">Traffic</label>
    <select id="edge-traffic">
      <option value="0" ${edge.traffic === 0 ? "selected" : ""}>Clear</option>
      <option value="1" ${edge.traffic === 1 ? "selected" : ""}>Moderate</option>
      <option value="2" ${edge.traffic === 2 ? "selected" : ""}>Heavy</option>
    </select>

    <label class="checkbox-label" for="edge-blocked">
      <input type="checkbox" id="edge-blocked" ${edge.blocked ? "checked" : ""}>
      <span>Blocked</span>
    </label>
  `;

  container.querySelector("#edge-traffic").addEventListener("change", event => {
    edge.traffic = Number(event.target.value);
    onChange(edge);
  });

  container.querySelector("#edge-blocked").addEventListener("change", event => {
    edge.blocked = event.target.checked;
    onChange(edge);
  });
}
