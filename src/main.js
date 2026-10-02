// src/main.js

import {
  buildGraph,
  nearestNode,
  nearestEdge,
  routePoints
} from "./engine/graph.js";

import { aStar } from "./engine/astar.js";
import { dijkstra } from "./engine/baseline.js";
import { inferResources } from "./engine/inference.js";

import {
  dispatch,
  resetAllVehicles
} from "./engine/dispatch.js";

import {
  reroute,
  needsReroute,
  pathUsesEdge
} from "./engine/reroute.js";

import { VEHICLES } from "./data/vehicles.js";

import {
  renderMap,
  showRoutes,
  showIncident,
  showVehicles,
  showEdgeOverrides
} from "./ui/mapView.js";

import {
  renderIncidentForm,
  setIncidentLocation,
  renderEdgeControls
} from "./ui/controls.js";

import {
  renderResults,
  renderPlanReview,
  renderFleetDashboard,
  showRerouteEvent
} from "./ui/panel.js";

import { drawLabels } from "./ui/labels.js";
import { enableLabelEditor } from "./ui/labelEditor.js";

// ========================================
// INITIALIZATION
// ========================================

const response = await fetch("./src/data/city.json");

if (!response.ok) {
  throw new Error(
    `Could not load city.json: ${response.status}`
  );
}

const city = await response.json();
const graph = buildGraph(city);

const fleet = structuredClone(VEHICLES);

const mapEl = document.getElementById("map");
const formEl = document.getElementById("form");
const resultsEl = document.getElementById("results");
const edgeEl = document.getElementById("edge-controls");
const resetBtn = document.getElementById("reset");
const hint = document.querySelector(".hint");

let svg = null;
let selectedEdge = null;
let tickTimer = null;

// Incident currently awaiting confirmation.
let pendingIncident = null;
let pendingPlan = null;

// ========================================
// MAP PAINTING
// ========================================

function paint() {
  if (!svg) return;

  showEdgeOverrides(
    svg,
    graph,
    selectedEdge
  );

  const moving = fleet.filter(
    vehicle =>
      vehicle.status === "dispatched" &&
      vehicle.path
  );

  showRoutes(
    svg,
    moving.map(vehicle => ({
      type: vehicle.type,
      points: vehicle.edges?.length
        ? routePoints(
            vehicle.path,
            vehicle.edges
          )
        : []
    }))
  );

  showVehicles(
    svg,
    graph,
    fleet.filter(
      vehicle => vehicle.status !== "available"
    )
  );
}

// ========================================
// A* VS DIJKSTRA
// ========================================

function searchNote(result) {
  const sample = result.assignments[0];

  if (!sample) return "";

  const baseline = dijkstra(
    graph,
    sample.from,
    sample.path.at(-1)
  );

  return `
    For ${sample.vehicleId}, A* expanded
    <b>${sample.explored}</b> junctions.
    Dijkstra expanded <b>${baseline.explored}</b>.
    Route cost: ${(sample.cost / 60).toFixed(2)} minutes.
  `;
}

// ========================================
// DEBUG ROUTE COSTS
// ========================================

function debugVehicles(incidentNode) {
  console.log("Incident node:", incidentNode);
  console.log(
    "Incident coordinates:",
    graph.nodes[incidentNode]
  );

  const comparisons = fleet
    .filter(vehicle => vehicle.status === "available")
    .map(vehicle => {
      const result = aStar(
        graph,
        vehicle.node,
        incidentNode
      );

      return {
        vehicle: vehicle.id,
        type: vehicle.type,
        start: vehicle.node,
        incident: incidentNode,
        cost: result.cost,
        reachable: result.path !== null,
        pathLength: result.path?.length ?? 0
      };
    });

  console.table(comparisons);
}

// ========================================
// RESULTS
// ========================================

function updateResults(incident, plan, result) {
  renderResults(
    resultsEl,
    incident,
    plan,
    result,
    searchNote(result)
  );
}

// ========================================
// FLEET DASHBOARD
// ========================================

function updateFleetDashboard() {
  const dashboard = document.getElementById("fleet-dashboard");

  if (dashboard) {
    renderFleetDashboard(dashboard, fleet);
  }
}

// ========================================
// PLAN REVIEW
// ========================================

function showPlanReview(incident, plan) {
  // Preview on a separate copy. Real vehicles remain untouched.
  const previewFleet = structuredClone(fleet);

  const preview = dispatch(
    graph,
    plan.needs,
    incident.node,
    previewFleet
  );

  pendingIncident = incident;
  pendingPlan = plan;

  renderPlanReview(
    resultsEl,
    incident,
    plan,
    preview
  );

  // The buttons are created by renderPlanReview.
  document
    .getElementById("confirm-dispatch")
    ?.addEventListener("click", confirmDispatch);

  document
    .getElementById("cancel-plan")
    ?.addEventListener("click", cancelPlan);
}

// ========================================
// CONFIRM DISPATCH
// ========================================

function confirmDispatch() {
  if (!pendingIncident || !pendingPlan) return;

  const incident = pendingIncident;
  const plan = pendingPlan;

  // Clear pending state before starting the simulation.
  pendingIncident = null;
  pendingPlan = null;

  // Dispatch the real fleet only after confirmation.
  const result = dispatch(
    graph,
    plan.needs,
    incident.node,
    fleet
  );

  updateResults(
    incident,
    plan,
    result
  );

  showIncident(
    svg,
    graph,
    incident.node
  );

  paint();
  updateFleetDashboard();
  startSimulation();
}

// ========================================
// CANCEL PLAN
// ========================================

function cancelPlan() {
  pendingIncident = null;
  pendingPlan = null;

  resultsEl.innerHTML = `
    <p class="muted">
      Dispatch cancelled. No vehicles were sent.
    </p>
  `;

  paint();
  updateFleetDashboard();
}

// ========================================
// SIMULATION
// ========================================

function stopSimulation() {
  if (tickTimer !== null) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
}

function startSimulation() {
  stopSimulation();

  tickTimer = setInterval(() => {
    let moved = false;

    for (const vehicle of fleet) {
      if (
        vehicle.status !== "dispatched" ||
        !vehicle.path ||
        vehicle.path.length < 2
      ) {
        continue;
      }

      vehicle.path.shift();

      if (vehicle.edges?.length) {
        vehicle.edges.shift();
      }

      vehicle.node = vehicle.path[0];
      moved = true;

      if (vehicle.path.length < 2) {
        vehicle.status = "arrived";
        vehicle.path = [vehicle.node];
        vehicle.edges = [];
      }
    }

    if (moved) {
      paint();
      updateFleetDashboard();
    }

    const stillMoving = fleet.some(
      vehicle => vehicle.status === "dispatched"
    );

    if (!stillMoving) {
      stopSimulation();
    }
  }, 850);
}

// ========================================
// ROAD CHANGES AND REROUTING
// ========================================

function onGraphChange(edge) {
  showEdgeOverrides(
    svg,
    graph,
    selectedEdge
  );

  for (const vehicle of fleet) {
    if (
      vehicle.status !== "dispatched" ||
      !vehicle.destination
    ) {
      continue;
    }

    const blocked = needsReroute(
      vehicle,
      graph.edges
    );

    const affected =
      edge &&
      pathUsesEdge(vehicle.path, edge);

    if (!blocked && !affected) continue;

    const next = reroute(
      graph,
      vehicle,
      vehicle.destination
    );

    if (!next) {
      vehicle.status = "stuck";
      vehicle.path = [vehicle.node];
      vehicle.edges = [];

      showRerouteEvent(
        resultsEl,
        vehicle.id,
        null
      );

      continue;
    }

    vehicle.path = next.path;
    vehicle.edges = next.edges;
    vehicle.node = next.path[0];

    showRerouteEvent(
      resultsEl,
      vehicle.id,
      next.cost
    );
  }

  paint();
  updateFleetDashboard();
}

// ========================================
// INCIDENT REPORTING
// ========================================

renderIncidentForm(
  formEl,
  incident => {
    if (!incident.node) {
      resultsEl.innerHTML = `
        <p>Click the map to select an incident location.</p>
      `;
      return;
    }

    // Stop any previous simulation.
    stopSimulation();

    // Keep the existing one-incident-at-a-time behavior.
    resetAllVehicles(fleet);

    pendingIncident = null;
    pendingPlan = null;

    debugVehicles(incident.node);

    const plan = inferResources(incident);

    // Show a review screen instead of dispatching immediately.
    showPlanReview(
      incident,
      plan
    );

    showIncident(
      svg,
      graph,
      incident.node
    );

    paint();
    updateFleetDashboard();
  }
);

// ========================================
// MAP CREATION
// ========================================

svg = renderMap(
  mapEl,
  graph,
  (x, y, event) => {
    if (event.shiftKey) {
      selectedEdge = nearestEdge(
        graph,
        x,
        y
      );

      renderEdgeControls(
        edgeEl,
        selectedEdge,
        onGraphChange
      );

      showEdgeOverrides(
        svg,
        graph,
        selectedEdge
      );

      return;
    }

    const node = nearestNode(
      graph,
      x,
      y
    );

    if (!node) return;

    setIncidentLocation(node);

    showIncident(
      svg,
      graph,
      node
    );
  }
);

// ========================================
// LABELS
// ========================================

const places = [];

drawLabels(
  svg,
  graph,
  places
);

// ========================================
// LABEL EDITOR
// ========================================

const params = new URLSearchParams(
  window.location.search
);

if (params.get("label") === "1") {
  enableLabelEditor(
    svg,
    places,
    () => drawLabels(
      svg,
      graph,
      places
    )
  );
}

// ========================================
// INSTRUCTIONS
// ========================================

if (hint) {
  hint.textContent =
    "Click the map to pin an incident. Shift-click a road to change traffic or block it.";
}

// ========================================
// RESET
// ========================================

resetBtn?.addEventListener(
  "click",
  () => {
    stopSimulation();

    pendingIncident = null;
    pendingPlan = null;

    resetAllVehicles(fleet);

    for (const edge of graph.edges) {
      edge.traffic = 0;
      edge.blocked = false;
    }

    selectedEdge = null;
    edgeEl.innerHTML = "";

    setIncidentLocation(null);

    showIncident(
      svg,
      graph,
      null
    );

    paint();
    updateFleetDashboard();

    resultsEl.innerHTML = "";
  }
);

// ========================================
// INITIAL DRAW
// ========================================

paint();
updateFleetDashboard();