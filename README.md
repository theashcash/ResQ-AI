# ResQ-AI — AI Emergency Response Planner

ResQ-AI is a small AI decision-support system for emergency dispatch. It
decides **what** resources an incident needs using a rule-based expert
system, and **how** to get them there using A* heuristic search — with
automatic rerouting if the road network changes mid-response.

This project is intentionally small and simulated: no real emergency
services, live GPS, real-time traffic APIs, machine learning, or complex
multi-vehicle coordination are used. The goal is to demonstrate how
rule-based reasoning and heuristic search can support decision-making in
a manageable college AI project.

## How it works

1. **Report** — an incident is entered: type, severity, people involved,
   number injured, and whether fire/hazards are present.
2. **Reason** — a forward-chaining rule engine matches these facts against
   a knowledge base and concludes how many ambulances, police vehicles
   and fire trucks are needed, plus an overall priority.
3. **Dispatch** — for each required vehicle type, A* computes the route
   cost from every available unit to the incident, and the cheapest
   units are selected. Units that can't be fully covered are reported
   as shortages rather than silently dropped.
4. **Respond** — dispatched vehicles move along their routes. If a road
   on a vehicle's path becomes blocked or congested, A* re-runs from the
   vehicle's *current* location and the route updates automatically.

The city is modelled as a graph: intersections are nodes, roads are
edges. Each edge has a distance and a traffic level; traffic increases
the effective cost of a road, and a blocked road is treated as
unusable. A* uses `f(n) = g(n) + h(n)`, where `g(n)` is the cost
already travelled and `h(n)` is the straight-line (Euclidean) distance
to the goal, so the system finds the cheapest route rather than simply
the shortest one.

## Project structure

```
resq-ai/
├── index.html              # app shell: incident form, map, results panel
├── style.css
├── src/
│   ├── data/
│   │   ├── city.js         # NODES, EDGES, STATIONS — the road graph
│   │   ├── rules.js        # knowledge base for the inference engine
│   │   └── vehicles.js     # ambulance / fire truck / police fleet
│   ├── engine/
│   │   ├── astar.js        # A* search, edge cost model, heuristic
│   │   ├── inference.js    # forward-chaining rule engine
│   │   ├── dispatch.js     # selects and routes available units
│   │   └── reroute.js      # replans a route when the graph changes
│   ├── ui/
│   │   ├── mapView.js      # renders the SVG map, routes, vehicles
│   │   ├── controls.js     # incident form, block-road / traffic controls
│   │   └── panel.js        # results panel and reasoning trace
│   └── main.js              # wires the engine and UI together, app state
├── tests/
│   ├── astar.test.js
│   ├── inference.test.js
│   └── dispatch.test.js
└── README.md
```

The `engine/` modules are pure functions with no DOM dependency, so they
can be tested and reasoned about independently of the UI.

## Tech stack

- Vanilla JavaScript (ES modules) — no framework, no build step
- SVG for the map (nodes, roads and routes as DOM elements)
- Node's built-in test runner (`node --test`) for unit tests
- Plain HTML/CSS for the interface

## Getting started

```bash
git clone <repo-url>
cd resq-ai
```

Open `index.html` with a local server (ES modules don't load from
`file://`) — for example the VS Code **Live Server** extension, or:

```bash
npx serve .
```

## Running tests

```bash
node --test
```

## Core concepts

### Rule-based reasoning (`inference.js`)

Rules are plain data in `rules.js`: a condition on the incident facts,
and what the rule concludes. The engine repeatedly scans the rules and
fires any whose condition now matches, until a full pass fires nothing
new — this is what makes it forward chaining rather than a single
lookup: some rules read facts that other rules wrote (e.g. a rule can
add police units once another rule has set priority to `CRITICAL`).
Every firing is recorded in a `trace`, which the results panel shows so
the AI's reasoning is visible, not just its conclusion.

### A* search (`astar.js`)

```
f(n) = g(n) + h(n)
```

- `g(n)` — cost already travelled from the start
- `h(n)` — straight-line distance from `n` to the goal (never
  overestimates the true remaining cost, so the search stays optimal)
- Edge cost = distance × a traffic multiplier (`1 + traffic × 0.5`);
  a blocked edge is treated as unusable.

### Dispatch (`dispatch.js`)

Given the resource needs from `inference.js` and the incident's
location, this runs A* from every *available* unit of each required
type and sends the cheapest ones. If fewer units are available than
needed, the shortfall is reported rather than hidden.

### Dynamic rerouting (`reroute.js`)

On every simulation tick, `needsReroute()` checks whether the next road
on a vehicle's path has become blocked. If so, `reroute()` re-runs A*
from the vehicle's current node (not its original start) to the same
destination, so the vehicle adapts to a changing environment instead of
following a fixed plan.

## Example

```js
import { inferResources } from "./src/engine/inference.js";
import { dispatch } from "./src/engine/dispatch.js";

const plan = inferResources({
  type: "accident",
  severity: "high",
  peopleInvolved: 6,
  injured: 3,
  fire: true,
});
// plan.needs     -> { ambulance: 2, police: 2, fire_truck: 2 }
// plan.priority  -> "CRITICAL"
// plan.trace     -> ["R1 fired: ...", "R2 fired: ...", ...]

const result = dispatch(plan.needs, "F");
// result.assignments -> [{ vehicleId, type, path, cost }, ...]
// result.shortages   -> [{ type, needed, sent, missing }, ...]
```

## Evaluation

The project compares A* against a baseline uninformed search (BFS or
Dijkstra) on the same queries, recording nodes explored and route cost,
to show that the heuristic reduces the search space without sacrificing
optimality under the chosen cost model.

## Limitations

- The city graph and traffic levels are simulated, not sourced from a
  live map or traffic feed.
- The rule base is illustrative and would need calibration against real
  dispatch data for production use.
- Only single-incident dispatch is handled; competing simultaneous
  incidents are not optimally arbitrated.

## Syllabus mapping

- **Intelligent agents** — the dispatch system is modelled as a
  goal-based agent: percepts (incident reports, traffic, blocked
  roads), actions (select unit, route, reroute), goal (minimum
  response cost).
- **Search** — graph search, heuristic functions, A*, and the effect of
  the heuristic on search efficiency.
- **Knowledge representation and reasoning** — a rule-based expert
  system with forward chaining.