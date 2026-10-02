// src/main.js
// Load the real map, click two points, and compare A* with Dijkstra.

import { buildGraph, nearestNode, routePoints } from "./engine/graph.js";
import { aStar } from "./engine/astar.js";
import { dijkstra } from "./engine/baseline.js";
import { renderMap, showRoute, showMarks } from "./ui/mapView.js";
import { drawLabels } from "./ui/labels.js";
import { enableLabelEditor } from "./ui/labelEditor.js";

// Load graph and UI elements
const graph = buildGraph(await (await fetch("src/data/city.json")).json());
const out = document.getElementById("results");

const say = html => {
  out.innerHTML = `<section><h3>Route test</h3>${html}</section>`;
};

let picks = [];

// Load labels
const places = await fetch("src/data/labels.json")
  .then(r => (r.ok ? r.json() : []))
  .catch(() => []);

// Render the map
const svg = renderMap(document.getElementById("map"), graph, (x, y) => {
  if (picks.length === 2) picks = [];

  picks.push(nearestNode(graph, x, y));
  showMarks(svg, graph, picks);

  if (picks.length < 2) {
    return say("<p>Now click the destination.</p>");
  }

  const a = aStar(graph, ...picks);
  const d = dijkstra(graph, ...picks);

  if (!a.path) {
    return say("<p>No route between these points.</p>");
  }

  showRoute(svg, routePoints(a.path, a.edges));

  say(`
    <p>Travel time <b>${(a.cost / 60).toFixed(1)} min</b>
    over ${a.edges.length} road segments.</p>

    <p>A* expanded <b>${a.explored}</b> junctions;
    Dijkstra expanded <b>${d.explored}</b>
    for the same cost.</p>
  `);
});

// Draw labels
drawLabels(svg, graph, places);

// Enable the manual label editor only in label mode
const params = new URLSearchParams(window.location.search);

if (params.get("label") === "1") {
  enableLabelEditor(svg, places, () => {
    drawLabels(svg, graph, places);
  });
}

say("<p>Click two points on the map.</p>");