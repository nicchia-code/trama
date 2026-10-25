---
column: done
technical: false
refs:
  - agent-terminal
  - requirements/rules#agent-terminal
  - requirements/quality#agent-terminal
  - requirements/rules#developer.ASK_MORE
  - requirements/ui#developer.ASK_MORE
  - requirements/rules#omp-chat-general
  - requirements/rules#agent-launching
  - requirements/quality#agent-launching
  - requirements/tech#agent-launching
  - requirements/tech#agent
  - requirements/tech#task
  - requirements/rules#work
drift: null
proposal: t72q0waa
agent: false
created: 2026-10-25T06:36:02.401Z
finished: 2026-10-25T06:38:34.903Z
---
# Drop Drift Blocker sentence

The Drift Blocker is gone, so no instruction Trama sends to an agent mentions it any more: not the instructions of terminal jobs, not Ask more, not the General omp Chat, not the sub-agent or advisor prompts. Every Drift blocks Tasks by the normal rule.

When done:

- No instruction carries the sentence "The Drift blocker is on: follow its steps whenever you file a Drift, and tell your sub-agents.", whatever the user settings hold. A leftover `trama.driftBlocker` user setting is neither read nor deleted. `DRIFT_BLOCKER_SENTENCE` and `withDriftBlocker` in `extension/src/host/prompts.ts` and `configuredDriftBlocker` in `extension/src/host/agent.ts` are removed.
- `agentPrompt` in `extension/src/host/agent.ts` builds the instruction with its sentences in this order, each only under its existing condition: limit, sub-agent compare ("Compare each Machine with the trama-analysis sub-agent."), Parallel Execution, Advisor, Async Drift Resolver, Context Sharing, the questions sentence (ask the developer), auto exit, language. The questions sentence always stays on the instruction's line, right after the limit, sub-agent and optional-feature sentences and right before the language one (auto exit, when on, sits between them). The Async Drift Resolver sentence keeps its place and still goes only to an instruction that lets the agent file Drifts (`filesDrifts` stays, used by the Async Drift Resolver). Doc comments of `agentPrompt` and `LaunchJobOptions.filesDrifts` no longer mention the Drift blocker.
- Ask more on a Drift: the Drift part of the prompt lists no freed Tasks and asks for no reads about them. `AskMoreSubject` (drift kind) in `prompts.ts` has no `notBlocking`, `askMorePart` drops the freed-Tasks list and its `trama task show` reads, and `extension/src/host/ask-more.ts` no longer passes `drift.data.notBlocking`. An old `notBlocking` in a Drift file is simply ignored.
- Sub-agent prompts in `src/core/sub-agents.ts`: the `trama-implementer` prompt tells it to read only the sections "When you must file a Drift" and "Writing a Drift" of the trama-implement skill, with no mention of a "Drift blocker" section or of "The Drift blocker is on". The `trama-analysis` prompt no longer says to follow the "Drift blocker" section of the trama-compare skill when the task says the Drift blocker is on, nor to report which Tasks a Drift leaves free. The list of sentences passed on to sub-agents contains no Drift blocker sentence.
- Advisors' instructions in `src/core/advisors.ts` no longer mention `notBlocking`: a Drift is filed with `trama drift new` without `task`, following the Drift rules of the trama-implement skill.
- Tests: the Drift-blocker cases in `test/host-agent-terminals.test.ts` and `test/host-prompts.test.ts` are removed or updated to the new sentence order and to the Ask more Drift part without freed Tasks.
