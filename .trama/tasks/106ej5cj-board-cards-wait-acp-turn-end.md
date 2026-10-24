---
column: done
technical: false
refs:
  - panel/Board
drift: null
proposal: kv1x3wmx
agent: false
created: 2026-10-24T14:42:09.104Z
finished: 2026-10-24T15:30:08.345Z
---
# Cards wait for ACP turn end

A card just delivered by an agent (a delivered Proposal, a Drift or a filed Task) waits for the end of that agent's turn before it can be decided or started: its buttons (approve and reject of the Proposal, on the Board and in the Diagram; Resolve and Dismiss Drift, on the Board and in the Diagram; Run and Delete in the Task's details) stay unavailable, saying the agent is still finishing, and enable on their own when the turn ends.

In an omp Chat conversation of a job the end of the turn is now omp's answer to the prompt over ACP (the `session/prompt` response carrying a `stopReason`, with no developer message waiting), that is the Event `omp-acp.TURN_ENDED`, and no longer the hook reporting idle: in conversations (environment `TRAMA_ACP=1`) the hook reports neither idle nor started. On that end the host releases the cards the conversation delivered, in this window and in every other window that hears of it, as it already does through `endFiledWork` when `endAgentWork` (`extension/src/host/agent.ts`) runs for a terminal; today a conversation reaches this only through `agentIdle` in `extension/src/host/omp-chat/conversations.ts`, which must stop being the trigger.

The other ends are unchanged: the hook at rest in a terminal (omp terminal path, omp Chat off or ACP start fallen back to a terminal), the end of the command or of the process, the closing of its terminal or its conversation, or the execution check stopping to follow that job. Ask more and General conversations have no recognisable end of turn: they produce no `omp-acp.TURN_ENDED`, so nothing they deliver is held waiting for one beyond those other ends.
