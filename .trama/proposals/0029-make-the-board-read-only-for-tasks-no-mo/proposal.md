---
status: approved
base:
  work/task.md: eff584e0e0daf4264904f50af032e58e0c0bc2ff5b24d0e9455ada3708260799
  work/feature.md: ce0957bff2695d077e84fa94891d2227d05cf8fe90792bbbec242d62606888da
  editor-panel/panel.md: 211e3ce585768293f57c7465a4a41c51299582e299cfaa59f53dcd1a57595d3c
  editor-panel/feature.md: 208049ecdc53969f915b97a2a123772c11598d50d2bdd227e3e251dd78d3b064
  actors/developer.md: 8210e44f8fe9a8ee009e806260d1f4ec1aec27c9e9d0a3ad77e1a6741be4cb24
  requirements/ui.md: 3fad5af9063fe24006548f52ac2a0590f19934faeb273eb9e6b7ca9826163504
  requirements/rules.md: 194c80137cf58bca6c1453132ef40fe86e893a39a8541667fdb3d381eaf10262
  requirements/tech.md: 2451868b7ba3faef2422479fdba7ab6da9659c49927c78c0254010df971c8b3e
delete: []
---
# Make the Board read-only for Tasks: no moving, dragging or taking back from the GUI

The Board in the editor must offer no way to move cards between columns. The developer's only actions on it are: approve or reject a Proposal, keep a side of a Drift (and rework a stale Proposal), and run the agent (Run on a Task, Run all To do, Run this design). Everything that moves a card arbitrarily (move arrows, drag and drop, the Take back button, the pending-move dimming) goes away. Looking and opening stays: links to the Diagram, opening and closing design cards, Show details, closing notices. The command line is untouched and can still do everything (task move, take-back, proposal discard). Decisions for the developer to check: (1) when the agent's command ends, every Task it had taken goes back to To do instead of staying In progress, so nothing is left stuck without a GUI way out; (2) the Board's move and take-back messages to the editor are removed, not just ignored.
