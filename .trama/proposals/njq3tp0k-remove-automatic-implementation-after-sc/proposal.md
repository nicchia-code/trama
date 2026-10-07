---
status: approved
base:
  agent-launching/feature.md: 4d4b2b99b9fd0cd35d24d1df0cf51b7cc86fed2353b5044145217e867c60a3b3
  agent-launching/agent-terminal.md: d0d891a048910174212d39c2e04e141c1c0d55515c6fd87f474714ded09e7cd5
  agent-launching/scan-hold.md: 59f79926686b9297199f403cba1376edeb8fcc7b89bf7d28b1f8941919e6c3f9
  requirements/rules/agent-terminal.md: 7c4d848851ee1f0185164e8c34fde6ebdda2eb0103b56da4775c6d7633a92a7d
  requirements/rules/scan-hold.md: fb0aae7df8890312a63ee4305e8dbb2532a70c9683b352513f37b875228fb4ec
  requirements/rules/tasks.md: 4c05e0277021b38e756ec590062c11cddce4fb02a7b3d8a216c5f316a34d829c
  requirements/tech/agent-terminal.md: 9641d0c88deb9a66554ea80d34ad32242f82177ec857e0f55d486fc84e028f4d
  requirements/tech/general.md: d97c826d11dcaa15596f35cc3d968d52062a36808a52e1f53c7a9f89a49af897
  requirements/ui/agents.md: 85b8f29528bc2919ad41c1887228e8736085aaef5ef1ef10b69cc1564bba43ea
delete: []
created: 2026-10-07T05:28:01.347Z
scanScope:
  - ref: agent-launching
    reason: changed
  - ref: agent-terminal/No agent terminal/proposal.APPROVED
    reason: changed
  - ref: scan-hold/On/developer.TURN_SCAN_HOLD_OFF
    reason: changed
  - ref: requirements/rules#agent-terminal
    reason: changed
  - ref: requirements/rules#scan-hold
    reason: changed
  - ref: requirements/rules#announcement
    reason: changed
  - ref: requirements/tech#agent-terminal
    reason: changed
  - ref: requirements/tech#General
    reason: changed
  - ref: requirements/ui#agent-terminal
    reason: changed
---
# Remove automatic implementation after scan

L'implementazione dei Task nati da una Proposal approvata è una decisione del developer: Trama non deve più farla partire da sola dopo la scansione automatica. Sostituisce la bozza 12bad0zc, diventata obsoleta perché il Modello è cambiato mentre veniva scritta (rimozione di multi-branch).

Decisioni:
- L'impostazione `trama.autoImplement` è rimossa del tutto: la scansione automatica dopo un'approvazione, e quella in sospeso allo spegnimento di Hold scan, si fermano sempre dopo aver archiviato i Task. Un valore rimasto nelle impostazioni utente è ignorato e non viene riscritto.
- Nessun avviso nuovo: il developer trova i Task sulla Board, nella scheda di design con Run this design.
- La domanda sui worktree del multi-branch non si applica più: multi-branch non è più nel Modello.
