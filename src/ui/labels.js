// src/ui/labels.js - facility names plus area/landmark names, drawn above the map.
// pointer-events are off so labels never block map clicks.
const NS = "http://www.w3.org/2000/svg";
const COLOR = { hospital: "#4cc9f0", fire_station: "#ff8a3d", police: "#9d8cff" };
const FONT = { "font-family": "Public Sans, system-ui, sans-serif", "pointer-events": "none",
  "paint-order": "stroke", stroke: "#0d1b2a", "stroke-width": 12, "stroke-linejoin": "round" };   // dark halo = readable on roads

const short = n => n.replace(/^Fire and Rescue Station\s+/i, "").replace(/\s+(Hospital|Police Station)$/i, "").replace(/^Janamythri,?\s*/i, "");

function text(parent, s, x, y, attrs) {
  const t = document.createElementNS(NS, "text");
  for (const [k, v] of Object.entries({ x, y, ...FONT, ...attrs })) t.setAttribute(k, v);
  t.textContent = s;
  parent.appendChild(t);
}

// places = contents of labels.json (optional): [{ name, kind: "place" | "landmark", x, y }]
export function drawLabels(svg, graph, places = []) {
  const g = document.createElementNS(NS, "g");
  svg.appendChild(g);
  for (const p of places) {                                    // area names and landmarks (quieter than facilities)
    if (p.kind === "landmark") {
      const dot = document.createElementNS(NS, "circle");
      for (const [k, v] of Object.entries({ cx: p.x, cy: p.y, r: 16, fill: "#8fa3b8", "pointer-events": "none" })) dot.setAttribute(k, v);
      g.appendChild(dot);
      text(g, p.name, p.x + 30, p.y + 15, { "font-size": 38, fill: "#9fb4c9" });
    } else {
      text(g, p.name, p.x, p.y, { "font-size": 54, fill: "#7d99ba", "font-style": "italic", "text-anchor": "middle", "letter-spacing": 2 });
    }
  }
  const W = graph.meta.width_m;
  for (const f of graph.facilities) {                          // hospital / fire / police names, in the icon's colour
    const n = graph.nodes[f.node], left = n.x > W - 650;       // flip to the left near the right edge
    text(g, short(f.name), n.x + (left ? -95 : 95), n.y + 14,
      { "font-size": 40, "font-weight": 600, fill: COLOR[f.type], "text-anchor": left ? "end" : "start" });
  }
}