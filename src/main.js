// src/main.js - wires the three stages: Report -> Plan -> Respond.
import { buildGraph, nearestNode, nearestEdge, routePoints, unitPosition } from "./engine/graph.js";
import { dijkstra } from "./engine/baseline.js";
import { inferResources } from "./engine/inference.js";
import { dispatch, resetAllVehicles } from "./engine/dispatch.js";
import { advance, refresh } from "./engine/sim.js";
import { buildFleet, setBusy } from "./data/fleet.js";
import { SIM_SPEED, TIME_OF_DAY } from "./data/config.js";
import { applyTimeOfDay } from "./engine/traffic.js";
import { renderMap, showRoutes, showIncident, showVehicles, showEdgeOverrides } from "./ui/mapView.js";
import { renderIncidentForm, setIncidentLocation, renderEdgeControls, renderTimeOfDay } from "./ui/controls.js";
import { renderResults, renderPlanActions, renderRespond, updateLive, showToast } from "./ui/panel.js";
import { drawLabels } from "./ui/labels.js";
import { enableLabelEditor } from "./ui/labelEditor.js";

// ---------- load data ----------
const response = await fetch("./src/data/city.json");
if (!response.ok) throw new Error(`Could not load city.json: ${response.status}`);
const graph = buildGraph(await response.json());
const fleet = buildFleet(graph.facilities);            // 3 units per station, generated from city.json

const $ = id => document.getElementById(id);
const mapEl = $("map"), formEl = $("form"), resultsEl = $("results"), edgeEl = $("edge-controls");

let svg, stage = "report";                              // "report" | "plan" | "respond"
let incident = null, plan = null, busy = false, mode = "offpeak";
let selectedEdge = null, selectedId = null, paused = false, speed = 1, raf = 0, last = 0;

const live = () => fleet.filter(v => ["dispatched", "arrived", "stuck"].includes(v.status));
const resetFleet = () => { resetAllVehicles(fleet); setBusy(fleet, busy); };

// ---------- drawing ----------
function remaining(v) {                                  // the route still to drive, from the unit's current spot
  if (!v.edges?.length) return [];
  if (v.s <= 0) return routePoints(v.path, v.edges);
  const n = graph.nodes[v.path[1]];
  const rest = v.edges.length > 1 ? routePoints(v.path.slice(1), v.edges.slice(1)) : [[n.x, n.y]];
  return [[v.pos.x, v.pos.y], ...rest];
}

function paint() {
  const units = live();
  for (const v of units) v.pos = unitPosition(graph, v);
  const routes = [];
  for (const v of units) {
    routes.push({ type: v.type, points: remaining(v), selected: v.id === selectedId, dim: v.id !== selectedId });
    if (v.reroutes > 0 && v.original) routes.push({ type: v.type, points: v.original, ghost: true });  // where it was going before
  }
  showRoutes(svg, routes);
  showVehicles(svg, graph, units);
}

// ---------- stage 2: plan (nothing is committed until Dispatch) ----------
function searchNote(result) {
  const a = result.assignments[0];
  if (!a) return "";
  const d = dijkstra(graph, a.from, a.path.at(-1));
  return `For ${a.vehicleId}, A* expanded <b>${a.explored}</b> junctions; Dijkstra expanded <b>${d.explored}</b>. Route cost: ${(a.cost / 60).toFixed(2)} minutes.`;
}

function makePlan() {
  stage = "plan"; stopLoop(); resetFleet();
  plan = inferResources(incident);
  const result = dispatch(graph, plan.needs, incident.node, fleet, false);     // preview only
  renderResults(resultsEl, incident, plan, result, searchNote(result));
  renderPlanActions(resultsEl, { ...result, busy }, on => { busy = on; makePlan(); }, dispatchNow);
  showIncident(svg, graph, incident.node);
  paint();
  showRoutes(svg, result.assignments.map(a => ({ type: a.type, points: routePoints(a.path, a.edges), selected: true })));
}

// ---------- stage 3: respond ----------
function dispatchNow() {
  const result = dispatch(graph, plan.needs, incident.node, fleet);            // commit
  stage = "respond"; selectedId = result.assignments[0]?.vehicleId; paused = false; speed = 1;
  panel(); paint(); startLoop();
}

const handlers = {
  pause: () => { paused = !paused; panel(); },
  speed: x => { speed = x; panel(); },
  select: id => { selectedId = id; panel(); paint(); },
  start: id => { const v = fleet.find(u => u.id === id); if (v?.status === "dispatched") v.moving = true; panel(); },
  startAll: () => { live().forEach(v => { if (v.status === "dispatched") v.moving = true; }); panel(); },
  newIncident: () => newIncident(),
};
const panel = () => renderRespond(resultsEl, { units: live(), selected: selectedId, paused, speed }, handlers);

function frame(t) {
  const dt = Math.min(0.1, (t - last) / 1000); last = t;       // real seconds since the last frame
  let arrived = false;
  if (!paused) for (const v of live()) if (v.moving) {
    advance(v, dt * SIM_SPEED * speed);                         // modelled seconds
    if (v.status === "arrived") arrived = true;
  }
  paint();
  if (arrived) panel(); else updateLive(resultsEl, live().find(v => v.id === selectedId));
  raf = requestAnimationFrame(frame);
}
const startLoop = () => { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame); };
const stopLoop = () => cancelAnimationFrame(raf);

// ---------- road changes (traffic / blocking) ----------
function onGraphChange(edge) {
  showEdgeOverrides(svg, graph, selectedEdge);
  if (stage === "plan") return makePlan();                      // the preview must reflect the new roads
  if (stage !== "respond") return;
  const notes = [];
  for (const v of live()) {
    const ev = refresh(graph, v, edge);
    if (ev?.type === "rerouted") notes.push([`${v.id} rerouted`, `The detour adds ${(ev.delta / 60).toFixed(1)} min.`]);
    if (ev?.type === "stuck") notes.push([`${v.id} stopped`, "No route to the incident is available. Reopen a road to let it continue."]);
    if (ev?.type === "resumed") notes.push([`${v.id} moving again`, "A route is available again."]);
  }
  if (notes.length) { panel(); notes.forEach(n => showToast(resultsEl, ...n)); }
  paint();
}

// ---------- time of day: paints default traffic on every road the user has not set by hand ----------
function setMode(next) {
  mode = next;
  const changed = applyTimeOfDay(graph, mode);
  renderTimeOfDay($("stage"), TIME_OF_DAY, mode, setMode);
  onGraphChange(changed);                                       // re-plan, or replan moving units whose route got slower
}

// ---------- stage 1: report ----------
renderIncidentForm(formEl, inc => {
  if (!inc.node) { resultsEl.innerHTML = "<p>Click the map to select an incident location.</p>"; return; }
  incident = inc; makePlan();
});

svg = renderMap(mapEl, graph, (x, y, ev) => {
  if (ev.shiftKey) {                                            // shift-click a road: traffic / block
    selectedEdge = nearestEdge(graph, x, y);
    renderEdgeControls(edgeEl, selectedEdge, onGraphChange);
    showEdgeOverrides(svg, graph, selectedEdge);
    return;
  }
  if (stage === "respond") return;                              // location is fixed once units are on the road
  const node = nearestNode(graph, x, y);
  if (!node) return;
  setIncidentLocation(node); showIncident(svg, graph, node);
  if (stage === "plan") { incident = { ...incident, node }; makePlan(); }
});

// ---------- initial traffic ----------
applyTimeOfDay(graph, mode);
renderTimeOfDay($("stage"), TIME_OF_DAY, mode, setMode);
showEdgeOverrides(svg, graph, null);

// ---------- layout: the map column matches the map's shape, the side panels share all the spare width ----------
function fitLayout() {
  const app = $("app"), h = app.clientHeight, w = app.clientWidth;
  if (window.innerWidth <= 1000 || h <= 0) { app.style.gridTemplateColumns = ""; return; }   // narrow screens stack instead
  const mid = Math.min(h * (graph.meta.width_m / graph.meta.height_m), w - 680);
  app.style.gridTemplateColumns = `minmax(320px, 1fr) ${Math.round(mid)}px minmax(380px, 1.3fr)`;
}
fitLayout();

// ---------- layout: the map is portrait, so give the side panels all the spare width ----------
const app = document.getElementById("app");
function fitStage() {
  if (window.innerWidth <= 1000) { app.style.gridTemplateColumns = ""; return; }       // stacked layout on narrow screens
  const ratio = graph.meta.width_m / graph.meta.height_m;
  const w = Math.max(320, Math.min(app.clientHeight * ratio, app.clientWidth - 300 - 340));
  app.style.gridTemplateColumns = `minmax(300px, 1fr) ${Math.round(w)}px minmax(340px, 1fr)`;
}
fitStage();

// ---------- labels ----------
const places = await fetch("./src/data/labels.json").then(r => (r.ok ? r.json() : [])).catch(() => []);
const redrawLabels = () => drawLabels(svg, graph, places);
redrawLabels();
let resizeTimer; window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { fitLayout(); redrawLabels(); }, 150); });   // keep label size constant on screen
if (new URLSearchParams(location.search).get("label") === "1") enableLabelEditor(svg, places, redrawLabels);
const hint = document.querySelector(".hint");
if (hint) hint.textContent = "Click the map to pin an incident. Shift-click a road to change traffic or block it.";

// ---------- reset ----------
function newIncident() {
  stopLoop(); stage = "report"; incident = plan = null; selectedId = null;
  resetFleet(); setIncidentLocation(null); showIncident(svg, graph, null);
  resultsEl.innerHTML = ""; paint();
}
$("reset")?.addEventListener("click", () => {
  busy = false; mode = "offpeak"; newIncident();
  for (const e of graph.edges) { e.userSet = false; e.blocked = false; }
  applyTimeOfDay(graph, mode); renderTimeOfDay($("stage"), TIME_OF_DAY, mode, setMode);
  selectedEdge = null; edgeEl.innerHTML = ""; showEdgeOverrides(svg, graph, null);
});
paint();