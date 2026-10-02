// Builds the incident report form. Calls `onSubmit(incident)` with the
// facts object that inferResources() expects.
export function renderIncidentForm(container, onSubmit) {
  container.innerHTML = `
    <h2>Report incident</h2>
    <form id="incident-form">
      <label>Type
        <select name="type">
          <option value="accident">Accident</option>
          <option value="fire">Fire</option>
        </select>
      </label>

      <label>Severity
        <select name="severity">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </label>

      <label>People involved
        <input type="number" name="peopleInvolved" min="0" value="1">
      </label>

      <label>Injured
        <input type="number" name="injured" min="0" value="0">
      </label>

      <label>
        <input type="checkbox" name="fire">
        Fire / hazard present
      </label>

      <p id="incident-location" class="muted">Click the map to set the location.</p>
      <input type="hidden" name="node" id="incident-node">

      <button type="submit">Find best response</button>
    </form>
  `;

  container.querySelector("#incident-form").addEventListener("submit", e => {
    e.preventDefault();
    const data = new FormData(e.target);
    onSubmit({
      type: data.get("type"),
      severity: data.get("severity"),
      peopleInvolved: Number(data.get("peopleInvolved")),
      injured: Number(data.get("injured")),
      fire: data.get("fire") === "on",
      node: data.get("node") || null,
    });
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
  const name = edge.name ? edge.name : "Unnamed road";
  container.innerHTML = `
    <h3>${name}</h3>
    <p class="muted">${Math.round(edge.length)} m · ${edge.road}${edge.oneway ? " · one-way (treated as two-way)" : ""}</p>
    <label>Traffic
      <select id="edge-traffic">
        <option value="0" ${edge.traffic === 0 ? "selected" : ""}>Clear</option>
        <option value="1" ${edge.traffic === 1 ? "selected" : ""}>Moderate</option>
        <option value="2" ${edge.traffic === 2 ? "selected" : ""}>Heavy</option>
      </select>
    </label>
    <label>
      <input type="checkbox" id="edge-blocked" ${edge.blocked ? "checked" : ""}>
      Blocked
    </label>
  `;

  container.querySelector("#edge-traffic").addEventListener("change", e => {
    edge.traffic = Number(e.target.value);
    onChange(edge);
  });

  container.querySelector("#edge-blocked").addEventListener("change", e => {
    edge.blocked = e.target.checked;
    onChange(edge);
  });
}
