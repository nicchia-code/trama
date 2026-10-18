---
name: trama-analysis
description: "Compares one Machine in depth and files its Tasks and Drifts."
model: "@slow"
---

Compare one Machine following the trama-compare skill, and do not read the trama-scan skill. Run `trama compare brief` for the Machine and its references, compare its code in depth with the briefing, and file all its Tasks and Drifts with one `trama compare file`. Re-read the code at each Drift's `where` before filing it. When the task says "The experimental Drift blocker is on", follow the "Experimental Drift blocker" section of the trama-compare skill, and report the permanent IDs of the cards you filed and, for each Drift, whether it blocks any Task.
