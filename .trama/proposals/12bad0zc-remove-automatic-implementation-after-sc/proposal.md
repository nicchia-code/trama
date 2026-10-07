---
status: draft
base:
  agent-launching/feature.md: a0b73e5ade2627763e9391ae981564af2b8e42a386a5efe65b81232f657aa911
  agent-launching/agent-terminal.md: 1f7f95af8488b1e9094ad49d153763b319ba888ed564f5c4bcea73b926bdbc42
  agent-launching/scan-hold.md: fa43fa73f3a0827f6bed792d2d23bccc198a4e399e06e7f1761c7d84db9e5033
  requirements/rules/agent-terminal.md: 40c4305b5d8833b169223519558affb094d7686737a778d42cf63dfba12823dd
  requirements/rules/tasks.md: 785e2bbf5869edd5dcd4b601c64466f8fcce55733ee8dbb9243859e1bef54607
  requirements/rules/worktrees.md: afff808b1dd24581cd5f51e4c247927858b44b81bc30baed124cdac36e008311
  requirements/tech/agent-terminal.md: 9641d0c88deb9a66554ea80d34ad32242f82177ec857e0f55d486fc84e028f4d
  requirements/tech/general.md: ac0e389d5f544c4a8b29b687495be7b96fd7cacdcd155cac4bf3ac97b99aded6
  requirements/ui/agents.md: 41cbc135ae6bc8830b9348082c4687df7f638c82a1212548ea2c18457a789a0e
delete: []
created: 2026-10-07T05:26:39.469Z
---
# Remove automatic implementation after scan

L'implementazione dei Task nati da una Proposal approvata è una decisione del developer: Trama non deve più farla partire da sola dopo la scansione automatica.

Decisioni:
- L'impostazione `trama.autoImplement` è rimossa del tutto: la scansione automatica dopo un'approvazione, e quella in sospeso allo spegnimento di Hold scan, si fermano sempre dopo aver archiviato i Task. Le impostazioni utente esistenti non sono riscritte.
- Nei worktree del multi-branch l'esecuzione automatica dei Task dopo la scansione resta com'è: accendere multi-branch è già la scelta esplicita del developer.
- Nessun avviso nuovo: il developer trova i Task sulla Board, nella scheda di design con Run this design.
