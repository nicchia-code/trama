---
column: done
technical: false
refs:
  - drift-resolution/Running tasks/omp-acp.TURN_ENDED
  - drift-resolution/Resolving/omp-acp.TURN_ENDED
  - drift-resolution/Unifying/omp-acp.TURN_ENDED
drift: null
proposal: kv1x3wmx
agent: false
created: 2026-10-24T14:42:09.104Z
finished: 2026-10-24T15:29:00.759Z
---
# Turn end ends conversation jobs

In an omp Chat conversation the end of a Run, of a resolution agent and of a unification agent is omp's answer over ACP to the job's prompt (the `session/prompt` response with its `stopReason`, with no developer message waiting), not the hook reporting idle: the hook no longer reports idle or started in conversations, while terminals keep `trama hook idle` / `trama hook start` as today.

When that answer arrives the window ends the conversation's work exactly as the hook at rest ends a terminal's work (`endAgentWork` in `extension/src/host/agent.ts`): the Tasks it took and the claims of its files are released, its registered process is forgotten, its announcements are withdrawn and its job ends, so the project goes back to Free.

- Running tasks: the last Run ends. A sequence of Run all counts as one Run: the end of one of its Runs that lets the next start, or leaves the others working, is not the end of the last Run. When the turn ended for an abnormal reason (refused, token limit, request limit, prompt refused by omp) the end is abnormal: the reason reaches the job's end (`jobAbnormalEnd`), a sequence of Run all stops without launching other Runs (`runSequence` / `runSequenceTogether` in `run-groups.ts`), and the notice at the top of the Board says why. A normal `end_turn` and a Stop by the developer show no notice.
- Resolving: the resolution agent has finished; a delivered but undecided Proposal keeps blocking another Resolve unless it was born from a prepared question.
- Unifying: the unification agent has finished; if it did not record the unified Drift, no Drift has changed.

No turn end in Ask more or in General ends a job. Whether the job is followed by the hook (`setHooked` / `isHooked` in `drift-resolution.ts`) no longer applies to conversations: a conversation job ends only at its turn end, its closure, its process exiting or the execution check.
