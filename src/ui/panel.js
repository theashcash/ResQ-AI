// src/ui/panel.js

// `plan` = output of inferResources(), `result` = output of dispatch()
export function renderResults(container, incident, plan, result) {

    container.innerHTML = "";

    const priorityColor = {
        CRITICAL: "#e74c3c",
        HIGH: "#e67e22",
        MEDIUM: "#f1c40f",
        LOW: "#2ecc71",
    }[plan.priority] || "#95a5a6";

    container.innerHTML = `
        <h2>AI Response</h2>

        <div class="priority-badge" style="background:${priorityColor}">
            ${plan.priority}
        </div>

        <h3>Resources required</h3>
        <ul class="needs-list">
            ${Object.entries(plan.needs)
                .filter(([, count]) => count > 0)
                .map(([type, count]) => `<li>${count} × ${formatType(type)}</li>`)
                .join("") || "<li>None</li>"}
        </ul>

        <h3>Dispatched units</h3>
        <ul class="assignments-list">
            ${result.assignments.length
                ? result.assignments.map(a => `
                    <li>
                        <strong>${a.vehicleId}</strong> (${formatType(a.type)})
                        — route ${a.path.join(" → ")}
                        — cost ${a.cost.toFixed(0)}
                    </li>
                `).join("")
                : "<li>No units dispatched</li>"}
        </ul>

        ${result.shortages.length ? `
            <h3 class="shortage-heading">⚠ Shortages</h3>
            <ul class="shortage-list">
                ${result.shortages.map(s => `
                    <li>${formatType(s.type)}: needed ${s.needed}, sent ${s.sent} (short ${s.missing})</li>
                `).join("")}
            </ul>
        ` : ""}

        <h3>Reasoning trace</h3>
        <ol class="trace-list">
            ${plan.trace.map(step => `<li>${step}</li>`).join("")}
        </ol>
    `;
}

function formatType(type) {
    return type.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase());
}

export function showRerouteEvent(container, vehicleId, newPath) {
    const el = document.createElement("div");
    el.className = "reroute-alert";
    el.textContent = `${vehicleId} rerouted: ${newPath.join(" → ")}`;
    container.prepend(el);
    setTimeout(() => el.remove(), 4000);
}
