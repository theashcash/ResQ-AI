// src/ui/labels.js - full facility names plus area/landmark names, drawn above the map.
// Sizes are set in SCREEN pixels (converted to map metres), so labels stay readable whatever the window size.
// Facility labels pick the free side of their icon (right, left, above, below) to avoid overlapping other labels.
const NS = "http://www.w3.org/2000/svg";
const COLOR = { hospital: "#0a5cc2", fire_station: "#a3186f", police: "#3b28b8" };   // darker shades of the unit colours, readable on the light map
const FONT = "Public Sans, system-ui, sans-serif";
const ICON_R = 70;                                             // facility icon radius in metres (see mapView.js)

export const short = n => n.replace(/^Fire and Rescue Station\s+/i, "").replace(/\s+(Hospital|Police Station)$/i, "").replace(/^Janamythri,?\s*/i, "");

// Break a long name into lines of at most `max` characters.
function wrap(name, max = 20) {
  const lines = [];
  for (const word of name.split(/\s+/)) {
    if (lines.length && (lines.at(-1) + " " + word).length <= max) lines[lines.length - 1] += " " + word;
    else lines.push(word);
  }
  return lines;
}

const overlap = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));

function text(parent, lines, x, y, size, attrs) {
  const t = document.createElementNS(NS, "text");
  const base = { "font-family": FONT, "font-size": size, "pointer-events": "none", "paint-order": "stroke",
    stroke: "#f6f8fb", "stroke-width": size * 0.34, "stroke-linejoin": "round", ...attrs };
  for (const [k, v] of Object.entries(base)) t.setAttribute(k, v);
  lines.forEach((line, i) => {
    const s = document.createElementNS(NS, "tspan");
    s.setAttribute("x", x); s.setAttribute("y", y + i * size * 1.18);
    s.textContent = line;
    t.appendChild(s);
  });
  parent.appendChild(t);
}

// places = labels.json (optional): [{ name, kind: "place" | "landmark", x, y }]
export function drawLabels(svg, graph, places = []) {
  svg.querySelector("#labels")?.remove();
  const { width_m: W, height_m: H } = graph.meta;
  const cw = svg.clientWidth || 1000, ch = svg.clientHeight || (1000 * H) / W;
  const px = n => n / Math.min(cw / W, ch / H);                // screen pixels -> map metres
  const g = document.createElementNS(NS, "g");
  g.id = "labels"; g.setAttribute("pointer-events", "none");
  svg.appendChild(g);

  const taken = graph.facilities.map(f => { const n = graph.nodes[f.node]; return { x0: n.x - ICON_R, y0: n.y - ICON_R, x1: n.x + ICON_R, y1: n.y + ICON_R }; });

  for (const p of places) {                                    // area names and landmarks (drawn first, kept quieter)
    if (p.kind === "landmark") {
      const s = px(14), w = p.name.length * s * 0.58, r = px(5);
      const dot = document.createElementNS(NS, "circle");
      for (const [k, v] of Object.entries({ cx: p.x, cy: p.y, r, fill: "#51627a", stroke: "#ffffff", "stroke-width": r * 0.4 })) dot.setAttribute(k, v);
      g.appendChild(dot);
      text(g, [p.name], p.x + r * 2.2, p.y + s * 0.35, s, { fill: "#34465c", "font-weight": 600 });
      taken.push({ x0: p.x, y0: p.y - s, x1: p.x + r * 2.2 + w, y1: p.y + s * 0.6 });
    } else {
      const s = px(20), w = p.name.length * (s * 0.6 + px(2));
      text(g, [p.name], p.x, p.y, s, { fill: "#4d6079", "font-style": "italic", "font-weight": 600, "text-anchor": "middle", "letter-spacing": px(2) });
      taken.push({ x0: p.x - w / 2, y0: p.y - s, x1: p.x + w / 2, y1: p.y + s * 0.4 });
    }
  }

  const s = px(15), gap = px(6);                               // facility names: full name, bold, wrapped
  for (const f of graph.facilities) {
    const n = graph.nodes[f.node], lines = wrap(f.name), w = Math.max(...lines.map(l => l.length)) * s * 0.58, h = lines.length * s * 1.18;
    const R = ICON_R + gap;
    const options = [
      { x0: n.x + R, y0: n.y - h / 2, anchor: "start" }, { x0: n.x - R - w, y0: n.y - h / 2, anchor: "end" },
      { x0: n.x - w / 2, y0: n.y - R - h, anchor: "middle" }, { x0: n.x - w / 2, y0: n.y + R, anchor: "middle" },
    ].map((o, i) => {
      const box = { x0: o.x0, y0: o.y0, x1: o.x0 + w, y1: o.y0 + h };
      const outside = Math.max(0, -box.x0) + Math.max(0, box.x1 - W) + Math.max(0, -box.y0) + Math.max(0, box.y1 - H);
      return { ...o, box, score: taken.reduce((t, b) => t + overlap(box, b), 0) + outside * h * 4 + i * 1e-3 };
    });
    const best = options.reduce((a, b) => (b.score < a.score ? b : a));
    taken.push(best.box);
    const x = best.anchor === "start" ? best.box.x0 : best.anchor === "end" ? best.box.x1 : (best.box.x0 + best.box.x1) / 2;
    text(g, lines, x, best.box.y0 + s * 0.85, s, { fill: COLOR[f.type], "font-weight": 700, "text-anchor": best.anchor });
  }
}