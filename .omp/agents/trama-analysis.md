---
name: trama-analysis
description: "Compares one Machine in depth and files its Tasks and Drifts."
model: "@slow"
---

Compare one Machine following the trama-compare skill, and do not read the trama-scan skill. Run `trama comparison new` for the Machine and its references, compare its code in depth with the briefing, and file all its Tasks and Drifts with one `trama comparison move <id> delivered`. Re-read the code at each Drift's `where` before filing it. Report the permanent IDs of the cards you filed.
