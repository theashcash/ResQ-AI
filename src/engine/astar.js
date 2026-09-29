import { NODES, EDGES } from "../data/city.js";


// ==========================================
// Find all roads connected to a node
// ==========================================

function getNeighbors(node) {

    const neighbors = [];

    for (const edge of EDGES) {

        // A -> B
        if (edge.from === node) {
            neighbors.push({
                node: edge.to,
                edge: edge
            });
        }

        // B -> A
        else if (edge.to === node) {
            neighbors.push({
                node: edge.from,
                edge: edge
            });
        }
    }

    return neighbors;
}


// ==========================================
// Calculate cost of travelling through an edge
// ==========================================

export function edgeCost(edge) {

    // Traffic increases travel cost.
    //
    // 0 → normal
    // 1 → medium
    // 2 → heavy

    const trafficMultiplier = 1 + (edge.traffic * 0.5);

    return edge.dist * trafficMultiplier;
}


// ==========================================
// Heuristic function
// ==========================================
//
// A* needs an estimate of the remaining distance.
//
// We use Euclidean distance:
//
// sqrt((x2-x1)^2 + (y2-y1)^2)

export function heuristic(nodeA, nodeB) {

    const a = NODES[nodeA];
    const b = NODES[nodeB];

    const dx = a.x - b.x;
    const dy = a.y - b.y;

    return Math.sqrt(dx * dx + dy * dy);
}


// ==========================================
// A* SEARCH
// ==========================================

export function aStar(start, goal) {

    // Nodes that still need to be explored
    const openSet = new Set([start]);

    // Where each node came from
    const cameFrom = {};

    // Cost from start → current node
    const gScore = {};

    // Estimated total cost
    const fScore = {};


    // Initially all costs are infinity
    for (const node of Object.keys(NODES)) {
        gScore[node] = Infinity;
        fScore[node] = Infinity;
    }


    // Starting node has cost 0
    gScore[start] = 0;

    fScore[start] = heuristic(start, goal);


    // ======================================
    // Main A* loop
    // ======================================

    while (openSet.size > 0) {

        // Find node with smallest fScore

        let current = null;

        for (const node of openSet) {

            if (
                current === null ||
                fScore[node] < fScore[current]
            ) {
                current = node;
            }
        }


        // Goal reached
        if (current === goal) {

            const path = [];

            let node = current;

            while (node !== undefined) {

                path.unshift(node);

                node = cameFrom[node];
            }

            return {
                path: path,
                cost: gScore[goal]
            };
        }


        // Remove current node from unexplored set
        openSet.delete(current);


        // Examine neighboring nodes
        const neighbors = getNeighbors(current);


        for (const { node: neighbor, edge } of neighbors) {

            // Ignore blocked roads
            if (edge.blocked) {
                continue;
            }


            // Cost of travelling current → neighbor
            const travelCost = edgeCost(edge);


            const tentativeG =
                gScore[current] + travelCost;


            // Is this route better?
            if (tentativeG < gScore[neighbor]) {

                cameFrom[neighbor] = current;

                gScore[neighbor] = tentativeG;

                fScore[neighbor] =
                    tentativeG + heuristic(neighbor, goal);

                openSet.add(neighbor);
            }
        }
    }


    // No route exists
    return {
        path: null,
        cost: Infinity
    };
}