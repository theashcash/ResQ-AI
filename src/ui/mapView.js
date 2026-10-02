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

// Draw order: minor roads first so main roads sit on top. [road classes, colour, width in px]
const LAYERS = [
  [["living_street", "residential", "unclassified"], "#2f4a66", 1],
  [["tertiary"], "#4a6d93", 1.6], [["secondary"], "#6f93bd", 2.2],
  [["primary"], "#9fc1e6", 3], [["trunk"], "#c3dcf5", 3.8],
];
const SHAPE = {   // 24x24 vector icons: cross = medical, flame = fire, shield = police
  cross: "M9 3h6v6h6v6h-6v6H9v-6H3V9h6z",
  flame: "M12 2c.6 3.6 5 5.6 5 10.5a5 5 0 0 1-10 0c0-1.9.8-3.2 2-4.2.1 1.6.8 2.6 1.9 3C10.4 7.4 10.6 4.6 12 2z",
  shield: "M12 2l8 3v6c0 5.2-3.4 9-8 11-4.6-2-8-5.8-8-11V5z",
};
const FACILITY = { hospital: ["cross", "#4cc9f0"], fire_station: ["flame", "#ff8a3d"], police: ["shield", "#9d8cff"] };

// onPick(x, y) receives the clicked point in map metres.
export function renderMap(container, graph, onPick) {
  container.innerHTML = "";
  const { width_m: W, height_m: H } = graph.meta;
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMid meet" }, container);

  for (const [classes, stroke, w] of LAYERS) {
    const d = graph.edges.filter(e => classes.includes(e.road))
      .map(e => "M" + e.geometry.map(p => p.join(" ")).join("L")).join("");
    el("path", { d, stroke, "stroke-width": w, ...NS_STROKE }, svg);
  }
  el("g", { id: "routes" }, svg);
  el("g", { id: "marks" }, svg);

  for (const f of graph.facilities) {
    const n = graph.nodes[f.node], [shape, color] = FACILITY[f.type];
    const g = el("g", { transform: `translate(${n.x} ${n.y})` }, svg);
    el("title", {}, g).textContent = f.name;
    el("circle", { r: 70, fill: "#0d1b2a", stroke: color, "stroke-width": 2.5, "vector-effect": "non-scaling-stroke" }, g);
    el("path", { d: SHAPE[shape], fill: color, transform: "translate(-45 -45) scale(3.75)" }, g);  // 24 units -> 90 m
  }

  svg.addEventListener("click", ev => {                      // screen pixels -> map metres
    const p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY;
    const m = p.matrixTransform(svg.getScreenCTM().inverse());
    onPick(m.x, m.y);
  });
  return svg;
}

export function showRoute(svg, points, color = "#4cc9f0") {
  const layer = svg.querySelector("#routes"); layer.replaceChildren();
  el("polyline", { points: points.map(p => p.join(",")).join(" "), stroke: color, "stroke-width": 4.5, ...NS_STROKE }, layer);
}

export function showMarks(svg, graph, ids) {                  // start (teal) and destination (red)
  const layer = svg.querySelector("#marks"); layer.replaceChildren();
  ids.forEach((id, i) => el("circle", { cx: graph.nodes[id].x, cy: graph.nodes[id].y, r: 55, fill: i ? "#e63946" : "#2ec4b6",
    stroke: "#fff", "stroke-width": 2, "vector-effect": "non-scaling-stroke" }, layer));
}