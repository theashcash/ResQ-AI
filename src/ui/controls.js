// src/ui/controls.js

// Builds the incident report form. Calls `onSubmit(incident)` with the
// facts object that inferResources() expects.
export function renderIncidentForm(container, onSubmit) {

    container.innerHTML = `
        <h2>Report Incident</h2>
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

            <label>Location node
                <select name="node" id="incident-node-select">
                    <!-- populated by main.js from NODES -->
                </select>
            </label>

            <button type="submit">Find best response</button>
        </form>
    `;

    container.querySelector("#incident-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const data = new FormData(e.target);

        const incident = {
            type: data.get("type"),
            severity: data.get("severity"),
            peopleInvolved: Number(data.get("peopleInvolved")),
            injured: Number(data.get("injured")),
            fire: data.get("fire") === "on",
            node: data.get("node"),
        };

        onSubmit(incident);
    });
}

// Fills the location dropdown from the city's node list.
export function populateNodeOptions(NODES) {
    const select = document.getElementById("incident-node-select");
    select.innerHTML = Object.entries(NODES)
        .map(([id, n]) => `<option value="${id}">${id} — ${n.name}</option>`)
        .join("");
}

// Simple road-control panel: click a road on the map (via mapView's
// onEdgeClick) and this shows a small popup to toggle its state.
export function renderEdgeControls(container, edge, onChange) {
    container.innerHTML = `
        <h3>Road ${edge.from} – ${edge.to}</h3>
        <label>Traffic
            <select id="edge-traffic">
                <option value="0" ${edge.traffic === 0 ? "selected" : ""}>Low</option>
                <option value="1" ${edge.traffic === 1 ? "selected" : ""}>Medium</option>
                <option value="2" ${edge.traffic === 2 ? "selected" : ""}>Heavy</option>
            </select>
        </label>
        <label>
            <input type="checkbox" id="edge-blocked" ${edge.blocked ? "checked" : ""}>
            Blocked
        </label>
    `;

    container.querySelector("#edge-traffic").addEventListener("change", (e) => {
        edge.traffic = Number(e.target.value);
        onChange();
    });

    container.querySelector("#edge-blocked").addEventListener("change", (e) => {
        edge.blocked = e.target.checked;
        onChange();
    });
}