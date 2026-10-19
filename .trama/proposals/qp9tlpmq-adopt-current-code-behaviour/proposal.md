---
status: approved
kind: resolution
drifts:
  - drift: 8p89sal6
    decision: proposal
  - drift: yy6xhhsp
    decision: proposal
  - drift: 9fq853jd
    decision: proposal
  - drift: sbiow3y9
    decision: proposal
base:
  requirements/rules/project.md: 06599cf60510f22100f2a24c96eb9c67dc9b2f02db624fddd881d0cdef8130b0
  agent-launching/drift-resolution.md: 8468abd11d5c88f3f6c321e38c37a3a681941149dcd29eedba466ff9aad7eb58
  requirements/rules/autopilot.md: 0b7917c2fae36d85ad309e2daf0053f02848152e322dd77176954f7790463d89
  requirements/tech/autopilot.md: c378833f6bd97ac8a5fc9ce2e18289642c90fae3a83fb7b979e3ed46bc0f6357
  requirements/ui/work.md: 87bf368e60f8a24b31dec9813f70881776ca182c44fd2a5ebdc9f326d1793a42
  requirements/rules/announcements.md: 81a77a05ad31382ee2b49c11ee241d65e08134a4674716757788351bc79af0b0
  requirements/tech/announcements.md: 57e3d56c21f14e7ce41f56c5761bf5116c224e7ba3b9cea4a6bb7e0aa17029a0
  requirements/ui/ghosts.md: dc9fac8884861d4ccf0a333d72c64953fd89665eebfae838303e8a8ce6bf47ce
delete: []
created: 2026-10-19T20:43:23.599Z
---
# Adopt current code behaviour

Resolves four Drifts by describing in the Model and the Requirements what the code already does, as the developer chose:

- Drift 8p89sal6 – Identity rewrite also changes History: proposal. The project rule on the identity rewrite also lists the Tasks in a Drift's non-blocking list and the Tasks cited by a History entry, as the data Requirements already say.
- Drift yy6xhhsp – Automatic step paused after failed send: proposal. The Drift resolution gains a paused state: an automatic collection or automatic Run that does not reach the agent pauses the delegation with a notice, until the developer really starts Resolve Drifts or a scan, or changes the mode.
- Drift 9fq853jd – Copilot chat ignores interrupt and close: proposal. The announcement rules say that Copilot's chat reports only the end of a turn, so its announcements are withdrawn at the end of a turn or at the editor's start.
- Drift sbiow3y9 – Drift ghost says Writing the Proposal: proposal. The ghost rules name the phase line Writing the Proposal for a Drift announcement whose Draft exists.
