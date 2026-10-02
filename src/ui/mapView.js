// src/ui/mapView.js - the real Kochi map as SVG. Roads are grouped by class into a handful of <path>s
// (thousands of separate lines would be slow), plus facility icons and route/marker layers.
const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  parent?.appendChild(n);
  return n;
};
const NS_STROKE = { fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", "vector-effect": "non-scaling-stroke" };

const LAYERS = [
  [["living_street", "residential", "unclassified"], "#2f4a66", 1],
  [["tertiary"], "#4a6d93", 1.6], [["secondary"], "#6f93bd", 2.2],
  [["primary"], "#9fc1e6", 3], [["trunk"], "#c3dcf5", 3.8],
];
const SHAPE = {
  cross: "M9 3h6v6h6v6h-6v6H9v-6H3V9h6z",
  flame: "M12 2c.6 3.6 5 5.6 5 10.5a5 5 0 0 1-10 0c0-1.9.8-3.2 2-4.2.1 1.6.8 2.6 1.9 3C10.4 7.4 10.6 4.6 12 2z",
  shield: "M12 2l8 3v6c0 5.2-3.4 9-8 11-4.6-2-8-5.8-8-11V5z",
};
const FACILITY = { hospital: ["cross", "#4cc9f0"], fire_station: ["flame", "#ff8a3d"], police: ["shield", "#9d8cff"] };
const UNIT_COLOR = { ambulance: "#4cc9f0", fire_truck: "#ff8a3d", police: "#9d8cff" };

function mapPoint(svg, ev) {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const p = svg.createSVGPoint();
  p.x = ev.clientX;
  p.y = ev.clientY;
  const m = p.matrixTransform(ctm.inverse());
  return { x: m.x, y: m.y };
}

export function renderMap(container, graph, onPick) {
  container.innerHTML = "";
  const { width_m: W, height_m: H } = graph.meta;
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMid meet", style: "background:#0d1b2a" }, container);

  for (const [classes, stroke, w] of LAYERS) {
    const d = graph.edges.filter(e => classes.includes(e.road))
      .map(e => "M" + e.geometry.map(p => p.join(" ")).join("L")).join("");
    el("path", { d, stroke, "stroke-width": w, ...NS_STROKE }, svg);
  }

  el("g", { id: "overrides" }, svg);
  el("g", { id: "routes" }, svg);
  el("g", { id: "marks" }, svg);
  el("g", { id: "units" }, svg);

  for (const f of graph.facilities) {
    const n = graph.nodes[f.node];
    const icon = FACILITY[f.type];
    if (!n || !icon) continue;
    const [shape, color] = icon;
    const g = el("g", { transform: `translate(${n.x} ${n.y})` }, svg);
    el("title", {}, g).textContent = f.name;
    el("circle", { r: 70, fill: "#0d1b2a", stroke: color, "stroke-width": 2.5, "vector-effect": "non-scaling-stroke" }, g);
    el("path", { d: SHAPE[shape], fill: color, transform: "translate(-45 -45) scale(3.75)" }, g);
  }

  svg.addEventListener("click", ev => {
    const m = mapPoint(svg, ev);
    if (m) onPick(m.x, m.y, ev);
  });
  return svg;
}

export function showRoutes(svg, routes) {
  const layer = svg.querySelector("#routes");
  layer.replaceChildren();
  for (const r of routes) {
    if (!r.points?.length) continue;
    el("polyline", {
      class: "route",
      points: r.points.map(p => p.join(",")).join(" "),
      stroke: UNIT_COLOR[r.type] || "#4cc9f0",
      "stroke-width": 4.5,
      ...NS_STROKE,
    }, layer);
  }
}

export function showIncident(svg, graph, nodeId) {
  const layer = svg.querySelector("#marks");
  layer.replaceChildren();
  if (!nodeId) return;
  const n = graph.nodes[nodeId];
  el("circle", { class: "ripple", cx: n.x, cy: n.y, r: 70 }, layer);
  el("circle", { class: "ripple r2", cx: n.x, cy: n.y, r: 70 }, layer);
  el("circle", { class: "inc-ring", cx: n.x, cy: n.y, r: 55 }, layer);
  el("circle", { cx: n.x, cy: n.y, r: 22, fill: "#e63946", stroke: "#fff", "stroke-width": 2, "vector-effect": "non-scaling-stroke" }, layer);
}

export function showVehicles(svg, graph, vehicles) {
  const layer = svg.querySelector("#units");
  layer.replaceChildren();
  for (const v of vehicles) {
    const n = graph.nodes[v.node];
    if (!n) continue;
    const g = el("g", {
      class: `vehicle${v.status === "dispatched" ? " active" : ""}`,
      transform: `translate(${n.x} ${n.y})`,
    }, layer);
    el("circle", { r: 40, fill: UNIT_COLOR[v.type] || "#4cc9f0", stroke: "#fff", "stroke-width": 2, "vector-effect": "non-scaling-stroke" }, g);
    el("title", {}, g).textContent = `${v.id} (${v.status})`;
  }
}

export function showEdgeOverrides(svg, graph, selected) {
  const layer = svg.querySelector("#overrides");
  layer.replaceChildren();
  for (const e of graph.edges) {
    const dirty = e.blocked || e.traffic > 0 || e === selected;
    if (!dirty) continue;
    const cls = e.blocked ? "road blocked" : `road t${e.traffic}`;
    el("polyline", {
      class: e === selected ? `${cls} edge-sel` : cls,
      points: e.geometry.map(p => p.join(",")).join(" "),
      fill: "none",
      "stroke-width": e === selected ? 7 : 4.5,
      "stroke-linecap": "round",
      "vector-effect": "non-scaling-stroke",
    }, layer);
  }
}
