---
status: approved
base:
  system.md: d6337f4c06fe0d254f969e7c4dc085d79ba40a54ae858326af30cb2f74299cf8
  actors/developer.md: 38dc0a367afd778ce01a6621d125d9fdf7c0c85aa195752731107c12f812d942
  actors/workspace.md: 78d1453ad1ef3d798cfa0f2aa6110e9a7c582cb8409c8996babf0e5285aee6f3
  agent-launching/agent-terminal.md: 1f7f95af8488b1e9094ad49d153763b319ba888ed564f5c4bcea73b926bdbc42
  agent-launching/feature.md: a0b73e5ade2627763e9391ae981564af2b8e42a386a5efe65b81232f657aa911
  editor-panel/panel.md: 9db1e9b622c69c1760cb397fb1120fcc413fc5c04f8b50689e653daf9968f62b
  model-changes/feature.md: 84013cb38767d73670081a7dd50cea00b0746d40e7eefc66c8ea5e10d31f736d
  model-changes/proposal.md: 8e1baddbc7a6f868844e25b4f3134155c3efcb8fe3c507d961d9890c9d79405b
  project-setup/project.md: 728581a39dea2b99377a6780137ffb3f21e7a4905d65883898d1bbb5cf227cd8
  work/announcement.md: 5e6381d2e9e5751f670f2c9a9c29ab9919a5e98996d546624d8a46b8e5bdce99
  work/drift.md: eb78a9286389d35b8f8c75cacb4b6d90f01d0eacbba6efd2ae96482bdbea6b6f
  work/feature.md: d06d4ed605013df771b8c46d68b67c64c59b9c0aedf47078b296ac166cc1a92b
  work/task.md: 48e6bffe10af8201193e1f27d1afe82a034befeb300fd426ccb25e3643cb28cc
  requirements/data/agents.md: 4ffbd88b0b2c18116af824bf57a2180594c297e4d15cde528d3029eba1e7e0ea
  requirements/data/general.md: 148b5321f8e8ae408d1372b7974ce035a82bf7a411a96b63e97b49055d80f125
  requirements/data/work.md: c2835b101d7d86eeef50112cc5199eceb7e8c945dc3531511f6087508b55144c
  requirements/quality/main.md: 5b8da55c2e0b440dbfc095e6184b9347d4a5a7ec6ad4d65416637d89a5ad00a9
  requirements/rules/decisions.md: f272d709befbd5dd568329eb3d496fc435ccdc03698fc08dc1b24d06059e9df7
  requirements/rules/general.md: 30246c6610a36ee08c05dbdb398f459523dc7b3d2030fc0a35cf19a5141a180e
  requirements/rules/project.md: e57534858e786a8884c03be7047ce9c05811bc0bfcef85c3c637290db668280a
  requirements/rules/tasks.md: 785e2bbf5869edd5dcd4b601c64466f8fcce55733ee8dbb9243859e1bef54607
  requirements/rules/agent-terminal.md: 40c4305b5d8833b169223519558affb094d7686737a778d42cf63dfba12823dd
  requirements/tech/announcements.md: 82977f31574895a52c152fff3c368d8f0569e21922c0e9f4f65ee03a646ade53
  requirements/tech/general.md: ac0e389d5f544c4a8b29b687495be7b96fd7cacdcd155cac4bf3ac97b99aded6
  requirements/tech/work.md: 369378f679117751aed395365edca15be2ca91572767c11bbe06f58bab1f1b61
  requirements/tech/worktrees.md: 7b901ec90d0a566c093d2c0027d7cccd21b7d19272564874d93dd6f731db913c
  requirements/ui/agents.md: 41cbc135ae6bc8830b9348082c4687df7f638c82a1212548ea2c18457a789a0e
  agent-launching/multi-branch.md: eab61c7b0009368539dbfb07076c71c97de1f5c17aef207fc7408731a2ee1be0
  agent-launching/worktree-round.md: 80d729ecb7541c0c8dfbbcf2587870b299036f49c5b7f99e49c37a4e42be62e0
  requirements/rules/worktrees.md: afff808b1dd24581cd5f51e4c247927858b44b81bc30baed124cdac36e008311
  agent-launching/scan-hold.md: fa43fa73f3a0827f6bed792d2d23bccc198a4e399e06e7f1761c7d84db9e5033
  requirements/tech/requests-scan-hold.md: new
  requirements/rules/scan-hold.md: new
delete:
  - agent-launching/multi-branch.md
  - agent-launching/worktree-round.md
  - requirements/rules/worktrees.md
  - requirements/tech/worktrees.md
request: 2026-10-07T07-17-57
created: 2026-10-07T05:20:46.450Z
scanScope:
  - ref: agent-launching
    reason: changed
  - ref: model-changes
    reason: changed
  - ref: work
    reason: changed
  - ref: developer
    reason: removed, its container
  - ref: workspace
    reason: removed, its container
  - ref: agent-terminal
    reason: changed
  - ref: agent-terminal/No agent terminal/proposal.APPROVED
    reason: changed
  - ref: agent-terminal/No agent terminal
    reason: removed, its container
  - ref: agent-terminal/Agent running/proposal.APPROVED
    reason: changed
  - ref: agent-terminal/Agent running
    reason: removed, its container
  - ref: agent-terminal/Agent idle/proposal.APPROVED
    reason: changed
  - ref: agent-terminal/Agent idle
    reason: removed, its container
  - ref: scan-hold
    reason: changed
  - ref: scan-hold/On/proposal.APPROVED
    reason: changed
  - ref: panel/Open
    reason: changed
  - ref: proposal
    reason: changed
  - ref: proposal/Open
    reason: changed
  - ref: proposal.APPROVED
    reason: changed
  - ref: project/Trama project/developer.REWRITE_IDENTITIES
    reason: changed
  - ref: announcement
    reason: changed
  - ref: drift
    reason: changed
  - ref: task
    reason: changed
  - ref: task/Taken by the agent/terminal.COMMAND_ENDED
    reason: changed
  - ref: panel/Closed/developer.OPEN_PANEL
    reason: leads into a change
  - ref: panel/Closed/question-round.ROUND_OPENED
    reason: leads into a change
  - ref: proposal/Draft/agent.SUBMIT_PROPOSAL
    reason: leads into a change
  - ref: project/Trama project/proposal.APPROVED
    reason: leads into a change
  - ref: requirements/data#General
    reason: changed
  - ref: requirements/data#announcement
    reason: changed
  - ref: requirements/data#proposal
    reason: changed
  - ref: requirements/rules#agent-terminal
    reason: changed
  - ref: requirements/rules#proposal/Approved
    reason: changed
  - ref: requirements/rules#General
    reason: changed
  - ref: requirements/rules#project
    reason: changed
  - ref: requirements/rules#scan-hold
    reason: changed
  - ref: requirements/rules#announcement
    reason: changed
  - ref: requirements/tech#announcement
    reason: changed
  - ref: requirements/tech#General
    reason: changed
  - ref: requirements/tech#task
    reason: changed
  - ref: requirements/tech#proposal
    reason: changed
  - ref: requirements/ui#scan-hold
    reason: changed
  - ref: requirements/data
    reason: removed, its container
  - ref: requirements/quality
    reason: removed, its container
  - ref: requirements/rules
    reason: removed, its container
  - ref: requirements/tech
    reason: removed, its container
  - ref: requirements/ui
    reason: removed, its container
---
# Rimozione del multi-branch e del giro di worktree

Il multi-branch e il giro di worktree si tolgono del tutto: forse torneranno in futuro, ma intanto la storia di git basta per un confronto.

Decisioni:
- Si toglie tutto: le Machine multi-branch e worktree-round, lo State proposal/In worktree, gli Event TURN_MULTI_BRANCH_ON, TURN_MULTI_BRANCH_OFF, WITHDRAW_FROM_ROUND, RECONCILE_MERGE, ABANDON_ROUND, WORKTREE_LOST e TREE_READY, ogni rimando nel Modello e le sezioni multi-branch, worktree-round e proposal/In worktree in tutte le Aree. Accettare una Proposal ha di nuovo una sola strada, nella cartella aperta.
- La cartella locale .trama/multi-branch/ già presente non è più letta né cancellata: la toglie il developer.
- trama.worktreeAgent non è più dichiarata né scritta; un valore già nelle impostazioni utente resta e non è letto.
- Un giro ancora aperto è ignorato: Trama non guarda più i worktree, le sue Proposal tornano da decidere, worktree e branch trama/* restano e il developer li toglie con git.
- Una regola in tech#General, come per trama.ntfy, dice che la funzione è rimossa senza sostituto né compatibilità e che documentazione e verifiche non la descrivono più.
- Lo switch Hold scan prende il posto di Multi-branch: subito dopo Design… in Diagramma, Board e Requirements, e nel Diagramma prima di Scan. Hold scan non nomina più i worktree.
- I frammenti si rinominano: requirements/rules/worktrees diventa requirements/rules/scan-hold e requirements/tech/worktrees diventa requirements/tech/requests-scan-hold, con titolo e descrizione nuovi; le skill trama-req-rules-worktrees e trama-req-tech-worktrees spariscono alla rigenerazione.
- In data#announcement l'elenco delle parti ignorate di .trama/ nomina scan-hold/ al posto di multi-branch/.
- Restano le frasi che non riguardano il multi-branch: l'identità propria delle schede perché due branch qualunque non si pestino, e il parallelismo dei sotto-agenti nella stessa cartella senza worktree.
