// src/ui/mapView.js - the real Kochi map as SVG, drawn like a printed street map: light land, white roads with grey casings
// (wider = more important), traffic painted ON the roads, and unit routes in colours that never clash with traffic.
// Roads are grouped by class into a few <path>s (thousands of separate lines would be slow).
const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  parent?.appendChild(n);
  return n;
};
const STROKE = { fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", "vector-effect": "non-scaling-stroke" };

// ---- palette: traffic = green/amber/red on roads; units = blue / magenta / indigo (no overlap with traffic) ----
const UNIT_COLOR = { ambulance: "#1f6feb", fire_truck: "#d6249f", police: "#5b3fd1" };
const UNIT_SHAPE = { ambulance: "cross", fire_truck: "flame", police: "shield" };
const FACILITY = { hospital: ["cross", UNIT_COLOR.ambulance], fire_station: ["flame", UNIT_COLOR.fire_truck], police: ["shield", UNIT_COLOR.police] };
const TRAFFIC = [null, "#f2a516", "#d62839"];                  // clear roads stay white; moderate amber; heavy red
const BLOCKED = "#1f2937";
const LAND = "#e3e8ed";

// [casing, fill] widths in screen pixels; drawing all casings first, then all fills, keeps junctions clean
const CLASS_W = { trunk: [7.8, 5.6], primary: [6.6, 4.6], secondary: [5.2, 3.4], tertiary: [4, 2.5], minor: [2.9, 1.6] };
const CASING = { minor: "#b4bdc8", tertiary: "#a5b0bd", secondary: "#96a2b1", primary: "#82909f", trunk: "#6f7e91" };
const ORDER = ["minor", "tertiary", "secondary", "primary", "trunk"];
const classOf = road => (road in CLASS_W ? road : "minor");

const SHAPE = {   // 24x24 vector icons: cross = medical, flame = fire, shield = police
  cross: "M9 3h6v6h6v6h-6v6H9v-6H3V9h6z",
  flame: "M12 2c.6 3.6 5 5.6 5 10.5a5 5 0 0 1-10 0c0-1.9.8-3.2 2-4.2.1 1.6.8 2.6 1.9 3C10.4 7.4 10.6 4.6 12 2z",
  shield: "M12 2l8 3v6c0 5.2-3.4 9-8 11-4.6-2-8-5.8-8-11V5z",
};

function mapPoint(svg, ev) {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const p = svg.createSVGPoint();
  p.x = ev.clientX; p.y = ev.clientY;
  const m = p.matrixTransform(ctm.inverse());
  return { x: m.x, y: m.y };
}

const pathOf = edges => edges.map(e => "M" + e.geometry.map(p => p.join(" ")).join("L")).join("");

export function renderMap(container, graph, onPick) {
  container.innerHTML = "";
  const { width_m: W, height_m: H } = graph.meta;
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMid meet", style: `background:${LAND}` }, container);

  for (const pass of ["casing", "fill"])
    for (const cls of ORDER) {
      const edges = graph.edges.filter(e => classOf(e.road) === cls);
      if (!edges.length) continue;
      el("path", { d: pathOf(edges), stroke: pass === "casing" ? CASING[cls] : "#ffffff",
        "stroke-width": CLASS_W[cls][pass === "casing" ? 0 : 1], ...STROKE }, svg);
    }

  el("g", { id: "overrides" }, svg);
  el("g", { id: "routes" }, svg);
  el("g", { id: "marks" }, svg);
  el("g", { id: "units" }, svg);

  for (const f of graph.facilities) {
    const n = graph.nodes[f.node], icon = FACILITY[f.type];
    if (!n || !icon) continue;
    const [shape, color] = icon;
    const g = el("g", { transform: `translate(${n.x} ${n.y})`, style: "filter:drop-shadow(0 1px 2px rgba(13,27,42,.4))" }, svg);
    el("title", {}, g).textContent = f.name;
    el("circle", { r: 70, fill: "#ffffff", stroke: color, "stroke-width": 3, "vector-effect": "non-scaling-stroke" }, g);
    el("path", { d: SHAPE[shape], fill: color, transform: "translate(-45 -45) scale(3.75)" }, g);
  }

  svg.addEventListener("click", ev => {
    const m = mapPoint(svg, ev);
    if (m) onPick(m.x, m.y, ev);
  });
  return svg;
}

// Each unit's route: white casing, solid colour, and a thin moving highlight so the direction of travel is visible.
export function showRoutes(svg, routes) {
  const layer = svg.querySelector("#routes");
  layer.replaceChildren();
  for (const r of routes) {
    if (!r.points?.length) continue;
    const pts = r.points.map(p => p.join(",")).join(" ");
    if (r.ghost) {                                              // the route a unit was following before it was rerouted
      el("polyline", { points: pts, stroke: "#64748b", "stroke-width": 3, opacity: 0.7, "stroke-dasharray": "2 8", ...STROKE }, layer);
      continue;
    }
    const c = UNIT_COLOR[r.type] || "#1f6feb", wide = r.selected;
    const g = el("g", { opacity: r.dim ? 0.55 : 1 }, layer);
    el("polyline", { points: pts, stroke: "#ffffff", "stroke-width": wide ? 12 : 8.5, ...STROKE }, g);
    el("polyline", { points: pts, stroke: c, "stroke-width": wide ? 7.5 : 5, ...STROKE }, g);
    el("polyline", { class: "route-flow", points: pts, stroke: "#ffffff", "stroke-width": 2, opacity: 0.85, ...STROKE }, g);
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
  el("circle", { cx: n.x, cy: n.y, r: 24, fill: "#e63946", stroke: "#ffffff", "stroke-width": 3, "vector-effect": "non-scaling-stroke" }, layer);
}

// Units: solid colour disc with a white icon, so they stand out on both white roads and coloured routes.
export function showVehicles(svg, graph, vehicles) {
  const layer = svg.querySelector("#units");
  layer.replaceChildren();
  for (const v of vehicles) {
    const n = v.pos || graph.nodes[v.node];                    // v.pos = live position along the road
    if (!n) continue;
    const g = el("g", { class: `vehicle${v.status === "dispatched" ? " active" : ""}`, transform: `translate(${n.x} ${n.y})` }, layer);
    el("circle", { r: 58, fill: UNIT_COLOR[v.type] || "#1f6feb", stroke: "#ffffff", "stroke-width": 3, "vector-effect": "non-scaling-stroke" }, g);
    el("path", { d: SHAPE[UNIT_SHAPE[v.type]], fill: "#ffffff", transform: "translate(-30 -30) scale(2.5)" }, g);
    el("title", {}, g).textContent = `${v.id} (${v.status})`;
  }
}

// Traffic painted on the roads: amber = moderate, red = heavy, dark dashes = blocked. Clear roads stay white.
export function showEdgeOverrides(svg, graph, selected) {
  const layer = svg.querySelector("#overrides");
  layer.replaceChildren();
  for (const e of graph.edges) {
    if (!(e.blocked || e.traffic > 0 || e === selected)) continue;
    const w = CLASS_W[classOf(e.road)][1], pts = e.geometry.map(p => p.join(",")).join(" ");
    if (e === selected) el("polyline", { points: pts, stroke: "#0d1b2a", "stroke-width": w + 4, ...STROKE }, layer);   // selection outline
    if (e.blocked) el("polyline", { points: pts, stroke: BLOCKED, "stroke-width": w, ...STROKE, "stroke-linecap": "butt", "stroke-dasharray": "5 4" }, layer);
    else if (e.traffic > 0) el("polyline", { points: pts, stroke: TRAFFIC[e.traffic], "stroke-width": w, ...STROKE }, layer);
    else el("polyline", { points: pts, stroke: "#ffffff", "stroke-width": w, ...STROKE }, layer);
  }
}