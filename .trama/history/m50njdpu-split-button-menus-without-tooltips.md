---
created: 2026-10-24T11:23:03.058Z
updated: 2026-10-24T11:23:03.058Z
summary: Items in the Reject, Dismiss Drift, Add Work Item and Rework with feedback menus have no tooltips; a disabled item shows its reason under the label.
tasks:
  - c0qj1k09
---
# Split-button menus without tooltips

Items in the split-button menus of Reject, Dismiss Drift, Add Work Item and Rework with feedback no longer show tooltips. Each item keeps its text as accessible name and gets an aria-description. A disabled item stays in the menu with its reason under the label, one reason per line. Unify Drifts has its own description. The main button and the arrow keep their tooltips. Implemented by Task c0qj1k09 across Board and Diagram.
