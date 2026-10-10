---
status: approved
base:
  actors/agent-hook.md: fe448dad8cbce6c4b4b25720077c406bd0c740973a455a8b13d2a4499097f4a1
  actors/time.md: 122fe3715e272ae7a6f4aa6650cf58b05e4a0c3291e9ae0fd0692647ccf2a0ac
  work/announcement.md: d675eb35fe349fe1302bba5bc1451683a02d7af83bdbd806dff304cb045fb94b
  work/task.md: c77da7ff9015d72d615b294eb07b7e40211f6ad8a74a0e0786ef9f9b7bb7a61e
  agent-launching/drift-resolution.md: 34cad10240893c065bff7cb8c2e3c8ca8d17973e9e6c26697d580e6b7e88ac08
  requirements/tech/omp-hook.md: 09b78b5b937b00a539d5464d95ce4b8fc0a1b5a6e110ffe4865b00af4d070172
  requirements/rules/announcements.md: 602e38133216ba287da5553086694a81cb2f7048454ae4cb7b0dec861e31d79f
  requirements/rules/drifts.md: 9d15096e53c502f3973e5a459a9c2ac532bffaf9e2c4081ad85c9958c6287751
  requirements/rules/agent-terminal.md: c1705fbdb23277aaf2580528110b8925dff92185dc746bec3bdcdadd06f0f1d6
  requirements/tech/announcements.md: d578cc92da14d9ad779f8929e616beb3ec3ee4beaac644230afbcd0b4ba4341a
delete: []
request: 2026-10-09T21-31-56
created: 2026-10-09T19:44:59.279Z
scanScope:
  - ref: agent-hook
    reason: changed
  - ref: agent-hook.IDLE
    reason: changed
  - ref: time.QUIET_PERIOD_ELAPSED
    reason: changed
  - ref: drift-resolution
    reason: changed
  - ref: announcement/Announced/time.QUIET_PERIOD_ELAPSED
    reason: changed
  - ref: task/Taken by the agent/time.QUIET_PERIOD_ELAPSED
    reason: changed
  - ref: agent-terminal/Agent running/agent-hook.IDLE
    reason: leads into a change
  - ref: drift-resolution/Running tasks/agent-hook.IDLE
    reason: leads into a change
  - ref: drift-resolution/Resolving/agent-hook.IDLE
    reason: leads into a change
  - ref: announcement/Announced/agent-hook.IDLE
    reason: leads into a change
  - ref: task/Taken by the agent/agent-hook.IDLE
    reason: leads into a change
  - ref: drift-resolution/Running tasks/time.QUIET_PERIOD_ELAPSED
    reason: leads into a change
  - ref: drift-resolution/Resolving/time.QUIET_PERIOD_ELAPSED
    reason: leads into a change
  - ref: requirements/rules#agent-terminal
    reason: changed
  - ref: requirements/rules#announcement
    reason: changed
  - ref: requirements/rules#drift-resolution
    reason: changed
  - ref: requirements/tech#announcement
    reason: changed
  - ref: requirements/tech#agent-hook
    reason: changed
---
# Fix omp sub-agent idle and add a heartbeat to the quiet period

Nelle corse lunghe con omp la Board ritira ghost e controlli mentre l'agente lavora ancora ("The agent stopped before finishing Final check after all Tasks.", "The agent finished without delivering Drift …"). Causa, provata con omp 18.4.4: l'hook è caricato anche in ogni sotto-agente; un sotto-agente finito è parcheggiato dopo 7 minuti e la chiusura della sua sessione fa partire `trama agent-event idle`, che ritira gli annunci del terminale, rilascia i Task presi e chiude il Run. Non sono i quindici minuti, da cui omp è già esente.

Decisioni:
- L'hook segnala la fine solo per la sessione principale di omp; la chiusura di un sotto-agente non dice mai che l'agente è a riposo.
- L'hook di omp manda un segnale di vita, da sé e senza che l'agente faccia nulla, ogni 5 minuti, solo mentre l'agente principale o un suo sotto-agente sta eseguendo un turno.
- omp perde l'esenzione dalla quiete: i quindici minuti restano quindici e il segnale di vita li fa ripartire.
- Il segnale di vita tiene vivi solo gli annunci e il Run del suo terminale.
- Quando la quiete chiude la corsa di un agente con hook, i Task presi da quel terminale tornano in To do, oltre al ritiro degli annunci e alla fine del Run.
- Anche i comandi di sola lettura di trama contano come attività, ma solo se vengono dall'agente che Trama riconosce (un terminale avviato da Trama o la chat di Cursor).
- Nessun segnale di vita per Claude Code, Codex, Copilot CLI e Cursor.
