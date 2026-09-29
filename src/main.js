import { inferResources } from "./engine/inference.js";
import { dispatch } from "./engine/dispatch.js";
import { needsReroute, reroute } from "./engine/reroute.js";

import { EDGES } from "./data/city.js";
import { VEHICLES } from "./data/vehicles.js";

// ==========================================
// 1. CREATE INCIDENT
// ==========================================

const incident = {
    type: "accident",
    severity: "high",
    peopleInvolved: 6,
    injured: 3,
    fire: true
};

console.log("=================================");
console.log("        RESQ-AI INCIDENT");
console.log("=================================");

console.log("Incident:", incident);


// ==========================================
// 2. AI INFERENCE
// ==========================================

const plan = inferResources(incident);

console.log("\n--- AI INFERENCE ---");

console.log("Required resources:");
console.log(plan.needs);

console.log("Priority:", plan.priority);

console.log("\nReasoning trace:");

for (const reason of plan.trace) {
    console.log("-", reason);
}


// ==========================================
// 3. DISPATCH VEHICLES
// ==========================================

const incidentNode = "F";

const result = dispatch(
    plan.needs,
    incidentNode
);

console.log("\n--- DISPATCH ---");

console.log("Assignments:");

for (const assignment of result.assignments) {
    console.log(
        `${assignment.vehicleId} (${assignment.type})`,
        "Path:",
        assignment.path,
        "Cost:",
        assignment.cost
    );
}

console.log("\nShortages:");

if (result.shortages.length === 0) {
    console.log("None");
} else {
    console.log(result.shortages);
}


// ==========================================
// 4. SIMULATE VEHICLE MOVEMENT
// ==========================================

function tick(vehicle, destinationNode) {

    // Vehicle has no route
    if (!vehicle.path || vehicle.path.length === 0) {
        console.log(`${vehicle.id} has no route.`);
        return;
    }

    // Vehicle has already reached destination
    if (vehicle.node === destinationNode || vehicle.path.length === 1) {
        console.log(`${vehicle.id} has reached ${destinationNode}.`);
        return;
    }


    // ======================================
    // CHECK WHETHER NEXT ROAD IS BLOCKED
    // ======================================

    if (needsReroute(vehicle, EDGES)) {

        console.log(
            `${vehicle.id}: Road ahead is blocked.`
        );

        const newRoute = reroute(
            vehicle,
            destinationNode
        );


        // No alternative route
        if (newRoute === null) {

            console.log(
                `${vehicle.id} is stuck — no route available.`
            );

            return;
        }


        // Apply new route
        vehicle.path = [...newRoute.path];

        console.log(
            `${vehicle.id} rerouted:`,
            vehicle.path
        );

        return;
    }


    // ======================================
    // MOVE TO NEXT NODE
    // ======================================

    const nextNode = vehicle.path[1];

    vehicle.node = nextNode;

    vehicle.path.shift();

    console.log(
        `${vehicle.id} moved to ${vehicle.node}`
    );

    console.log(
        "Remaining path:",
        vehicle.path
    );
}


// ==========================================
// 5. TEST VEHICLE MOVEMENT
// ==========================================

console.log("\n--- VEHICLE MOVEMENT ---");


// Get the actual vehicle object
// from the VEHICLES array

const firstAssignment = result.assignments[0];

if (firstAssignment) {

    const vehicle = VEHICLES.find(
        v => v.id === firstAssignment.vehicleId
    );


    if (vehicle) {

        // IMPORTANT:
        // dispatch() returns the path,
        // but the vehicle itself needs
        // to know its path for movement.

        vehicle.path = [
            ...firstAssignment.path
        ];


        console.log(
            `\nStarting ${vehicle.id}`
        );

        console.log(
            "Starting node:",
            vehicle.node
        );

        console.log(
            "Route:",
            vehicle.path
        );


        // ==================================
        // SIMULATE MOVEMENT
        // ==================================

        while (
            vehicle.node !== incidentNode &&
            vehicle.path.length > 1
        ) {

            tick(
                vehicle,
                incidentNode
            );
        }


        console.log(
            `\n${vehicle.id} final node:`,
            vehicle.node
        );
    }
}


// ==========================================
// 6. FINAL STATUS
// ==========================================

console.log("\n=================================");
console.log("          RESQ-AI COMPLETE");
console.log("=================================");

console.log(
    "Incident priority:",
    plan.priority
);

console.log(
    "Resources required:",
    plan.needs
);

console.log(
    "Vehicles dispatched:",
    result.assignments.length
);

console.log(
    "Shortages:",
    result.shortages.length
);
console.log("\n--- REROUTE TEST ---");

const testVehicle = {
    id: "TEST1",
    type: "ambulance",
    node: "E",
    path: ["E", "F", "J"],
    status: "dispatched"
};

console.log("Original route:", testVehicle.path);

// Block E → F
const edge = EDGES.find(
    e =>
        (e.from === "E" && e.to === "F") ||
        (e.from === "F" && e.to === "E")
);

edge.blocked = true;

console.log("Road E-F blocked.");

tick(testVehicle, "J");

console.log("New route:", testVehicle.path);

// Restore road
edge.blocked = false;