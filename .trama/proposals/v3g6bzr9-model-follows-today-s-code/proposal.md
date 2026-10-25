---
status: discarded
base:
  model/agent-launching/drift-resolution.md: new
  model/agent-launching/omp-chat-conversation.md: new
  model/agent-launching/feature.md: new
  model/project-setup/setup-wizard.md: new
  model/work/task.md: new
  requirements/ui/omp-chat.md: ce2b5b67c7ab9afbfe99919eb1db5a2dffe706612865e9b85103ee2d63370744
  requirements/ui/agents.md: af3bc84c18ae1ab4809853b23df5e8fb216c1a07cfe0f8e4120096b5084bdee3
  requirements/rules/omp-chat.md: 7b84bcf014a473b928bc95af8d79dae9678e4718a40af4083709b9e3452b4c63
  requirements/rules/drift-resolution.md: ca5a1b2a8e0964c3cc47e6a201954a3d0a7752843b3b6fa5a7338eeda602fdd7
  requirements/rules/omp-chat-general.md: 51599965a04ab8dd9c25045bd62506cf477f85a9124a3424100a6adb72d939b1
  requirements/rules/setup-wizard.md: 9a8accda3fb57795f947edc24437a02ffd432e783637b49dfb2af2f454fe9f54
  requirements/data/omp-chat.md: fbb427388a1167678e5cf2c4c8320c71f6b0566150b59858149a9fa1b6e67120
  requirements/data/history.md: c0594b2ba56314604d3f463dca528f7dbaadb22f12bac2abf303d0ad8ff846b4
  requirements/data/general.md: b637aa6bf67d5a8eb5c7e5b11bd21484e7c9a513e2c1e2ef0080257d5f46ab7f
  requirements/tech/panel.md: ebf395ae6f1e685fb817cda1f5c0e4b8c963f2ecf7035e6e94c6bcf05f149e73
  requirements/tech/drift-resolution.md: 8664ea10c3db4d74fb4dbffdc9ce076b4c0b9de01bf3905f53dd78a609ec4a24
  requirements/tech/proposal.md: 6eb7db2a61d807ee43864ee881b392e3f2f5eecdbb8d8cb4038427540a485f43
  requirements/tech/omp-chat-general.md: 54c9ee928935a3ced7626678420160debf50082b95d1252f647eba60a95097ef
  requirements/tech/setup-wizard.md: c2e231b4117b8116497e5950e6ef57c0974c00e14e5f1700ad8b170c583ec474
  agent-launching/drift-resolution.md: 417fd0208d9b03dd1dafc669d47261ce525e8bc648623488cd89e9f559a77d04
  agent-launching/omp-chat-conversation.md: 2fb7ed535eabc689d99aa2bcba58812fa968f940537de3096d55bc217a1d91b8
  agent-launching/feature.md: e0460d4d1c5c40ead2bc67486d4105a9d51227cfcfbb9e64346a7746fe20e065
  project-setup/setup-wizard.md: 0a6814888d3954d56ed84ad65cadee71ca066cd838ff750d91a4e6bfba9b9c77
  work/task.md: ff2faf96df237b515ead9c2d0a6466340294a49b2f6da8b0ff88f273d615d1a6
delete: []
created: 2026-10-24T20:42:32.480Z
label: code-as-model
---
# Model follows today's code

Choices for the Drift 88lo546l: the Model and the Requirements describe what the code does today for all twelve differences it unifies. Written as a Draft for the prepared question; the resolution writes the changes.

- General runs omp's update check and update at start (one-hour outcome shared with launches); closing the kept General uses the clearing dialog; the kept General keeps its saved entry until it disappears; General works in the first workspace folder.
- An answer that needs the agent is refused while a non-prepared resolution awaits a decision; Resolve and the agent of an answer do not check whether a resolution holds the Drift, only Rework with feedback does.
- An empty Ask more goes to Waiting for the window on window close; a hook-less job conversation comes back at rest after a reload, its Run in progress until closed.
- A cleared Task with a numbered identity no longer counts on Scan System.
- The wizard's check after the installer uses the saved omp path; a too-old omp that answers with models does not stop Next.
- `constructor` is a reserved ID.
