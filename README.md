# 🚨 RESQ-AI

### AI-Assisted Emergency Response and Dynamic Dispatch System

RESQ-AI is a lightweight AI-assisted emergency response simulation system that determines the resources required for an incident, dispatches the most suitable available emergency vehicles, calculates optimal routes using **A\*** search, and dynamically reroutes vehicles when roads become blocked.

The project combines **Artificial Intelligence, search algorithms, rule-based reasoning, and simulation** into a single emergency-response system.

---

## 📌 Overview

In an emergency, response time is critical. Different incidents require different combinations of emergency resources, and the best route can change when traffic conditions or road blockages occur.

RESQ-AI models this decision-making process as an intelligent agent.

Given an incident such as:

- 🚗 Traffic accident
- 🔥 Fire
- 🚑 Multiple injuries
- 🚧 Road blockage
- ⚠️ High-severity emergency

the system:

1. Analyzes the incident.
2. Determines the required emergency resources.
3. Assigns available vehicles.
4. Calculates routes using A*.
5. Considers traffic while calculating route cost.
6. Simulates vehicle movement.
7. Detects blocked roads.
8. Dynamically calculates alternative routes.
9. Reports resource shortages when sufficient vehicles are unavailable.

---

## 🎯 Objectives

The main objectives of RESQ-AI are:

- Implement a **rule-based AI inference system**.
- Use **forward chaining** to derive emergency-response requirements.
- Implement **A\*** for route planning.
- Incorporate traffic conditions into route costs.
- Automatically dispatch available emergency vehicles.
- Detect blocked roads during vehicle movement.
- Dynamically reroute vehicles.
- Handle situations where required resources are unavailable.
- Provide an interactive visual simulation of the emergency response process.

---

## 🧠 AI Components

RESQ-AI combines multiple AI concepts.

### 1. Rule-Based Inference

Emergency requirements are determined using predefined rules.

For example:

```text
IF accident AND injured >= 1
THEN dispatch ambulance