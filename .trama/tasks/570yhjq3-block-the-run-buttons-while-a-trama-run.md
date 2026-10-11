---
column: done
technical: false
refs:
  - panel/Board
  - requirements/rules#task
  - requirements/ui#panel/Board
  - requirements/tech#agent-terminal
  - requirements/ui#agent-terminal
drift: null
proposal: 8osh2q6r
agent: false
created: 2026-10-11T04:40:56.561Z
finished: 2026-10-11T04:51:09.697Z
---
# Block the Run buttons while a Trama run is in progress, under trama.submitWhileRunning

Add the setting trama.submitWhileRunning: a string, enabled or disabled, default disabled (an absent or unrecognised value is disabled), valid in user and workspace settings, with the English description the Requirements give. The extension watches it and sends the Board a fresh picture at once. With disabled, Run all To do, Run this design and the Run of each Task are unavailable while a run launched by Trama is not finished, with the same notion as the reason A run is in progress of Resolve Drifts (end-of-run scan included; this window's runs and, with the autopilot coordinator active, those of the other windows; an automatic run counts too). The buttons show disabled with the tooltip and accessible description A run is in progress, ranked after Drifts are being resolved and before the other reasons (a taken Task, all Tasks blocked). A Run request that still reaches the editor in that moment is refused like the other reasons. Scan, design, import and Resolve Drifts do not depend on the setting. With enabled everything stays as before.
