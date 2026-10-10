---
status: approved
kind: resolution
drifts:
  - drift: yljit2n1
    decision: fix-code
    option: 1
  - drift: jy4z017t
    decision: fix-code
    option: 1
  - drift: x34ydbn2
    decision: fix-code
    option: 1
  - drift: z2aatu13
    decision: proposal
base:
  work/task.md: e5de610a3b2bfcf2b87513189e0c362e505e522ad06dfc5411d82d2bb046f96d
  agent-launching/agent-terminal.md: 4fa7edd56c9f37d3e359c27e5ea66a86bcf48725e1bf77bc5b4ee9d40450efa4
  requirements/tech/omp-hook.md: 99db1abed513258439184f738c3fe494af5c0108af8a8e7a7e0ded9c3f21b227
delete: []
created: 2026-10-09T12:53:35.688Z
---
# Resolve hooked agent lifecycle and panel attachment Drifts

Risolve quattro Drift:
- Drift yljit2n1 – End of a hooked agent's command does not withdraw its terminal's announcements: si corregge il codice; la fine del comando scritto da Trama ritira gli annunci del terminale anche per un agente con hook (omp). La risoluzione allinea a questo il Requisito tech#agent-hook e la Machine del terminale dell'agente.
- Drift jy4z017t – The panel decides attachment to an open Drift outside src/core: si corregge il codice; src/core dice al pannello quali Proposal sono allegate a un Drift aperto e il pannello smette di ricalcolarlo.
- Drift x34ydbn2 – End of a hooked agent's command does not release its terminal's Tasks: si corregge il codice; la fine del comando scritto da Trama rilascia i Task presi dal terminale anche per un agente con hook. La risoluzione allinea a questo il Requisito tech#agent-hook e la Machine del terminale dell'agente.
- Drift z2aatu13 – Closing a hooked agent's terminal releases its Tasks without a Transition in the Task Machine: si adegua il Modello; la Machine del Task riceve la Transizione su terminal.CLOSED, solo per il terminale integrato di un agente con hook che aveva preso il Task.
