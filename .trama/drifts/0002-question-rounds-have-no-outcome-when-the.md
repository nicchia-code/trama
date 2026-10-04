---
status: resolved
resolution: proposal
refs:
  - question-round
proposal: "0013"
task: null
---
# Question rounds have no outcome when their editor closes

Task 0030 requires native, MCP and CLI callers to wait asynchronously for a complete question-round result. The question-round Model allows Not asked → Unanswered only when the editor is not reachable at request time. After admission, Queued can leave only when another round closes or the caller stops waiting; Asking can complete through developer answers/skips or be abandoned when the caller stops waiting. An editor window or extension host can close while a round is queued or being answered and its MCP/CLI caller is still waiting. No State or Transition handles this case. The no-response-timeout rule also prevents silently expiring it. Returning editor-unavailable, returning partial answers, reconnecting/restarting the round, or leaving the caller waiting indefinitely changes observable behavior and the disposition of accepted answers; the Model and Requirements do not decide among them. The existing shared contract in src/core/questions.ts defines QuestionHandler as a Promise<QuestionResult> and offers completed answers or editor unavailability, but has no implemented editor-loss lifecycle. The pending async integrations are src/tools/mcp.ts, src/cli/bin.ts and extension/src/host/tools.ts. I would define an explicit editor-loss transition for both Queued and Asking, discard the incomplete round's in-memory answers and return a distinct editor-unavailable result without fabricated answers, with the agent fallback policy stated explicitly for this case. Implementation stopped before changing code; Task 0030 remains doing. No Proposal is attached because this is an unresolved design case required by new implementation, not an existing correct implementation that the Model merely failed to describe.

## Developer decision

The developer rejected the suggested editor-unavailable fallback for editor loss during a round: stop the workflow instead. The developer explicitly confirmed that initial editor unavailability retains the existing fallback. Submitted Proposal 0013 implements this design in the Model and Requirements: editor loss interrupts active and queued rounds assigned to the lost window, discards incomplete answers and reports an interruption error; the agent stops the workflow without fallback, automatic recommendations or automatic retry/resumption. The earlier fallback suggestion above is superseded by this decision. The Drift remains open and Task 0030 remains doing pending the developer's decision.
