// src/ui/mapView.js — SVG map with inline vector icons and animated vehicles.
import { NODES, EDGES, STATIONS } from "../data/city.js";
import { VEHICLES } from "../data/vehicles.js";

const NS = "http://www.w3.org/2000/svg";
const R = 20;
const COLOR = { ambulance: "#4cc9f0", fire_truck: "#ff8a3d", police: "#9d8cff" };
const STATION_COLOR = { hospital: COLOR.ambulance, fire_station: COLOR.fire_truck, police_station: COLOR.police };
// One vector shape per role (24x24 grid): cross = medical, flame = fire, shield = police
const SHAPE = {
    cross: "M9 3h6v6h6v6h-6v6H9v-6H3V9h6z",
    flame: "M12 2c.6 3.6 5 5.6 5 10.5a5 5 0 0 1-10 0c0-1.9.8-3.2 2-4.2.1 1.6.8 2.6 1.9 3C10.4 7.4 10.6 4.6 12 2z",
    shield: "M12 2l8 3v6c0 5.2-3.4 9-8 11-4.6-2-8-5.8-8-11V5z"
};
const SHAPE_OF = { ambulance: "cross", hospital: "cross", fire_truck: "flame", fire_station: "flame", police: "shield", police_station: "shield" };

function el(tag, attrs = {}, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
}
const icon = (parent, kind, size, color) => el("path", {
    d: SHAPE[SHAPE_OF[kind]], fill: color,
    transform: `translate(${-size / 2} ${-size / 2}) scale(${size / 24})`
}, parent);
const roadClass = e => e.blocked ? "road blocked" : `road t${e.traffic}`;
const layer = (svg, id) => svg.querySelector("#" + id);

export function renderMap(container, onEdgeClick) {
    container.innerHTML = "";
    const svg = el("svg", { viewBox: "40 30 720 540", preserveAspectRatio: "xMidYMid meet" }, container);
    for (const id of ["roads", "routes", "nodes", "incident", "vehicles"]) el("g", { id }, svg);

    for (const e of EDGES) {
        const a = NODES[e.from], b = NODES[e.to];
        const pos = { x1: a.x, y1: a.y, x2: b.x, y2: b.y, "data-from": e.from, "data-to": e.to };
        el("line", { ...pos, class: "bed" }, layer(svg, "roads"))          // wide, clickable road bed
            .addEventListener("click", () => onEdgeClick(e));
        el("line", { ...pos, class: roadClass(e) }, layer(svg, "roads"));  // coloured traffic line
    }

    for (const [id, n] of Object.entries(NODES)) {
        const g = el("g", { class: "node-g" }, layer(svg, "nodes"));
        el("title", {}, g).textContent = `${id}: ${n.name}`;
        el("circle", { cx: n.x, cy: n.y, r: R, class: "node" }, g);
        el("text", { x: n.x, y: n.y, class: "nid" }, g).textContent = id;
        const kind = Object.keys(STATIONS).find(k => STATIONS[k].includes(id));
        if (kind) {
            const s = el("g", { class: "station", transform: `translate(${n.x} ${n.y - R - 18})` }, g);
            el("rect", { x: -13, y: -13, width: 26, height: 26, rx: 6, stroke: STATION_COLOR[kind] }, s);
            icon(s, kind, 14, STATION_COLOR[kind]);
        }
    }
    return svg;
}

export function updateRoads(svg) {
    for (const l of svg.querySelectorAll("line.road, line.blocked")) {
        const e = EDGES.find(e => e.from === l.dataset.from && e.to === l.dataset.to);
        if (e) l.setAttribute("class", roadClass(e));
    }
}

export const clearRoutes = svg => layer(svg, "routes").replaceChildren();

// Animated dashed route per dispatched unit, coloured by unit type
export function drawRoutes(svg, assignments = []) {
    clearRoutes(svg);
    for (const a of assignments) {
        if (!a.path || a.path.length < 2) continue;
        const c = COLOR[a.type];
        el("polyline", { class: "route", stroke: c, style: `color:${c}`,
            points: a.path.map(n => `${NODES[n].x},${NODES[n].y}`).join(" ") }, layer(svg, "routes"));
    }
}

// Pulsing ripple marks where the incident is
export function showIncident(svg, nodeId) {
    clearIncident(svg);
    const n = NODES[nodeId];
    const g = el("g", { transform: `translate(${n.x} ${n.y})` }, layer(svg, "incident"));
    el("circle", { r: R, class: "ripple" }, g);
    el("circle", { r: R, class: "ripple r2" }, g);
    el("circle", { r: R + 5, class: "inc-ring" }, g);
}
export const clearIncident = svg => layer(svg, "incident").replaceChildren();

// Vehicles are <g> groups moved with a CSS transform, so every step glides (see .vehicle in style.css)
export function drawVehicle(svg, v) {
    const n = NODES[v.node];
    if (!n) return;
    let g = svg.querySelector(`[data-id="${v.id}"]`);
    if (!g) {
        g = el("g", { class: "vehicle", "data-id": v.id, style: `color:${COLOR[v.type]}` }, layer(svg, "vehicles"));
        el("circle", { r: 13, fill: "#0d1b2a", stroke: COLOR[v.type], "stroke-width": 2 }, g);
        icon(g, v.type, 14, COLOR[v.type]);
    }
    const same = VEHICLES.filter(o => o.node === v.node);           // spread units sharing a node
    const dx = (same.indexOf(v) - (same.length - 1) / 2) * 30;
    g.style.transform = `translate(${n.x + dx}px, ${n.y + R + 20}px)`;
    g.classList.toggle("active", v.status === "dispatched");
}

export function removeVehicleMarker(svg, id) {
    svg.querySelector(`[data-id="${id}"]`)?.remove();
}