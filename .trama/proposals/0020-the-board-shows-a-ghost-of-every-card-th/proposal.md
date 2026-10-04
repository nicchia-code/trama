---
status: approved
base:
  actors/time.md: new
  work/announcement.md: new
  work/feature.md: 21363e192c7276e5dff9728f467d04752de52696a022bec0bc4da2c4e0013d56
  editor-panel/panel.md: 33498b192e4ff37744f009004639ee0efb827214c15635502316e38bf968cc24
  agent-launching/agent-terminal.md: 840c5e311f42e16b2dd9ce0669427b2adea3c141af6736632b2435184448474d
  requirements/ui.md: 90ab15f8cafe9f4f8536c585c338afb4337f89155d7739f340c1115df6eb486c
  requirements/data.md: 61eb40ce0991cf3b6b49133f6659acb2b76a680957354aebdbcae4c0b1aa1270
  requirements/rules.md: 9216a12e4454c40318e94c88762878100a8fcea32e5d491ff8d3d978a11f9d80
  requirements/tech.md: 05ed9e46fcb9272cacf124b2a26e6f8899679dcf368725c374593f05852c3a60
  actors/agent.md: c87c8fb46d0c075e11597e8a1dc15bc2dce85ba867c59f92487d2a73f461af8e
  actors/workspace.md: 47ce9cac87bfadf37cfdeb0b38fc4348cb9cda3913bc3a89334ca74ef8d6438e
delete: []
---
# The Board shows a ghost of every card the agent is about to create

After a request to the agent, the Board shows a skeleton ghost of each card the agent is going to create (a Proposal in To decide, a Task in To do, a Drift in To decide), as soon as it is known, and the ghost is replaced by the real card when it arrives. The ghost of a Task being moved by the developer, which was only on screen for the instant the move takes and so was never seen, is removed.

Decisions taken in the interview: any agent work that will create a card gets a ghost; the agent announces each card it is about to create and passes the announcement's ID when it creates the card; for a Design request Trama adds the ghost itself (terminal launcher only), with the chat launcher the ghost starts with the first Draft; phases "preparing", "writing" and "waiting for your answers" when a question round is open; when an announced card never comes, the ghost goes away at once and a notice says so; the ghost is not counted among what awaits a decision and cannot be clicked; announcements are temporary files under .trama/ ignored by git; a ghost nobody updates for 15 minutes goes away.

Decisions for the developer to check (not asked): the Task being moved keeps its dimmed, busy card (only its ghost is removed); a Design request includes the rework of a stale Proposal of a Drift; the first Draft opened after a Design request takes over its ghost, since the agent is not told the ghost's ID; a Draft opened with no ghost waiting makes its own (this is how the chat launcher gets one); an unknown or finished announcement ID never prevents a card from being filed; the 15 minutes do not run while a question round is open; the end of the agent's command or the closing of its terminal withdraws every ghost still waiting, as it releases every taken Task; at startup the extension withdraws the announcements left on disk; the ghost has an accessible name though it cannot be focused; the textual board (trama board) does not list announcements; the skills trama-design, trama-fix, trama-scan, trama-import and trama-implement are updated to announce.
