---
column: done
technical: false
refs:
  - requirements/ui#drift-resolution
  - drift-resolution
drift: null
proposal: lzg4385e
agent: false
created: 2026-10-11T04:20:58.785Z
finished: 2026-10-11T04:28:30.104Z
---
# Explain the mode and the autopilot waiting reasons in the Resolve Drifts tooltip

With the status line gone, the Resolve Drifts tooltip is where the developer reads what the active autopilot mode means and why automatic resolution is not starting: waiting for scans, suspended after a failed scan, coordinator unavailable, resume needed. These texts are also in the button's accessible description and never replace the priority reasons already there (Drifts are being resolved, a run is in progress, a Proposal awaits a decision, no open Drifts).
