---
status: approved
base:
  editor-panel/panel.md: a6e4841ad755359a5ee50e90383f803d46a9483bef07ee7acf873acd411d8918
  editor-panel/feature.md: 186e78a495cff47b615691e647cc26a9ec0fc8052a6a17952808948d30a911e6
  work/task.md: 2313e67f7a3080be2ac6f8aa71b0953270ad6c32224afd1baa112b65830bcd58
  work/drift.md: 20b1a1ba88510c3046d3f498a48ba704af755de1f3ac691bc249b82aece7e205
  work/announcement.md: 0221e96501317bb3cc1ad285e75266e87db973c3cc7aca4bca8f993b6679074c
  work/feature.md: 051cd041039c620fd9f7263c8828385e22778e3ac1e1a70b5eb9245796734daf
  agent-launching/drift-resolution.md: 8ffbfcf0923e112156a872010bf77092b7a25dff588bda8adf98861ca7a6ced6
  agent-launching/design-request.md: 31e960cad765494f216de61efe3c90829ec40c7a2b87b0b528103f1fb57ceb00
  agent-launching/feature.md: 42a1cda75b9d41d322b5216f67ff74ed91124337cb8bb03b7a159fd2ae0acf6e
  agent-launching/agent-terminal.md: a2d644a5a92dca655f1069df33dc6368e96c67fcbd6ab8fe2a1e8390eca22c5c
  actors/developer.md: 6a2eacfd415e866ac39afaa371cca28f81d67f13e2565b20684e6c10a5fbc83f
  model-changes/proposal.md: 9cce7cbe970a6ac8fd2bfd9f7d4d3c3efeea573af23a477127143cb3e21a586b
  model-changes/feature.md: 1ec047445bcbda6c70816a6677aeb6351edc0feab44eb19d371882be703e8b97
  requirements/ui/board.md: 09722146c403f691f74b0f37b1fe99de2281e9f451f034ce52107bd41cfa901b
  requirements/ui/panel.md: 7ddf81f9c5f3ab2e254f814497e218008ed31d8477b1c62ab800680715ba168e
  requirements/ui/agents.md: 7362ee950b8c935756f64a89cc86b8975bf6e0b07743e5a4fe08a96c8653d4b0
  requirements/ui/work.md: 842f4f740961c6c2144f77e463db71d4236257e48bdb260e1513713299712cf6
  requirements/ui/tasks.md: 59811b41eba12796829cbcd8dadda3556dc8262531bdd831196e0b7fed64b6b8
  requirements/data/work.md: 618caa4218905280789e02bb25371643812387899aa920f0e1c85f21207f2471
  requirements/data/proposals.md: 22bf1e6c5970a8ef93ab2d372eab453e6b03b5898612d807699613f3dc9066fb
  requirements/data/agents.md: 2ae01c6395280f290517316c8555526ff862e98888351fbc3b9efa2179512841
  requirements/rules/announcements.md: 6fbe7d226f3e1e5ff71ac49460799bd6c97d92402944aa39e898b2035b6cb6a5
  requirements/rules/tasks.md: c689c1e30b021bf1c785a1dd28a837e66465ef73bc7d1b66acec5fe117cde5e7
  requirements/rules/requests.md: 15a4ec10fa6e68af00433cd7002ccbb276b4aff2119c01ba502c99fdd3af958e
  requirements/rules/agent-terminal.md: e91f22ae590826b7286f665e829d7af758b95607ff35272508f2687af7d7557d
  requirements/rules/models.md: 6218c877215ae16e3b3d1378691be067845776ec4a9bd1c09bb998523327f080
  requirements/rules/decisions.md: 60011dc6fc9c0ed40ca3ef079677ad943fbe155f4d6228a2eff3956847d4a800
  requirements/tech/requests.md: b680d12de01fc3993641f4bde917d938184588a0f95156fe2b10a3d1814e1bac
  requirements/tech/project-panel.md: e68758d47b8ac53198bb60595a9862ee70c3d9c8ad6bc1d0cd2e91be9c6259d0
  requirements/tech/models.md: 3d98b53243369b235c6b4d156b81b94bfdbe463bdbfbb60e1663b6752143f7c5
  requirements/tech/proposal.md: 32250f0e737ac16661f693125c1ba8772c5e402d25d0a4bc7b70894c0961c48d
  requirements/tech/work.md: 284f0c9e45fbe3ccddf5881fd88311d96b9fd799ccfae5a3c2b1e524b4344293
  requirements/tech/agent-terminal.md: ccf42b9cc8cf95f7d1587241c94f90fb7528f44719293b8d379c01d0c19bc004
  requirements/tech/drifts.md: ffbfc67d81569b3c158a4bc9c5f71bf6fdfa4cc9a2bf03ad382c25207f62efad
  requirements/tech/autopilot.md: 3726c848216481a7e4d4020061cf3a0f3e1ee78d26be92abfe318fa3bad3ce66
  requirements/ui/ghosts.md: new
delete: []
request: 2026-10-17T11-04-11
created: 2026-10-17T09:56:59.865Z
---
# Board in Backlog, Active e Blocked

La richiesta di design «Rework UI/UX - Board» chiede una Board in cui ogni colonna dica una cosa sola: cosa aspetta l'approvazione, cosa è accettato o in corso, cosa è bloccato, cosa è stato fatto. Questa Proposal rifà le prime tre colonne, la barra e le schede; i ghost di ogni lavoro lanciato e i pulsanti che aspettano la fine del turno dell'agente sono nella Proposal `iwham416`, la colonna History nella Proposal `uvn8ulmq`, che si appoggiano a questa.

## Decisioni

- Colonne `Backlog`, `Active`, `Blocked` e `Done`; `Done` resta con i Task finiti finché la Proposal `uvn8ulmq` non la sostituisce con History.
- Barra: resta solo `Scan System`; spariscono `Run Ready Tasks`, `Resolve Drifts`, `Add Work Item…` e `Quick request…`.
- La richiesta rapida (`Quick request…`) è eliminata del tutto: un design si chiede solo con `+ Add Work Item` in fondo a Backlog.
- Backlog: tutte le Proposal consegnate (design, import, risoluzioni), ognuna con Approve e Reject; nessun `Approve all`.
- Una risoluzione consegnata è una sola scheda gialla in Backlog con i suoi Drift e, sotto ognuno, i Task che blocca; i suoi Drift lasciano Blocked finché è aperta.
- Active: una scheda per ogni Task in To do o In progress non bloccato; nessuna scheda di design, niente `Run this design`; `Run all` in fondo.
- Al posto delle schede di design, ogni Task ha un tag: l'etichetta breve della sua Proposal, scritta dall'agente, obbligatoria per le Proposal con Task, al massimo 30 caratteri, con un colore per etichetta preso dai colori del tema. I Task senza Proposal non hanno tag.
- Solo la scheda di un Task preso dall'agente ha il bordo animato blu/ciano, al posto del pallino che pulsava; un Task che aspetta di essere preso non ce l'ha.
- Blocked: i Drift aperti con dentro i Task che bloccano; un Task bloccato da più Drift compare in ognuno, con un'icona che nomina gli altri Drift. Ogni Drift ha `Resolve` (risolve solo lui) e `Dismiss Drift`; `Resolve all` in fondo.
- Un Task preso dall'agente che diventa bloccato resta in Active con il badge finché è preso, poi passa in Blocked.
- I Task che aspettano un Task di correzione stanno in Blocked in una scheda «Waiting for …»; il Task di correzione resta in Active da avviare.
- Mentre un agente risolve un Drift, la sua scheda resta in Blocked con il badge `Resolving` e i suoi pulsanti disabilitati.
- `Resolve` su un Drift: una risoluzione alla volta, come oggi, e applica la modalità corrente della delega.
- Tutti i ghost stanno in Active.
- Il numero sulla tab Board conta le schede di Backlog e i Drift di Blocked, non le schede «Waiting for».
- Testi: `No proposals`, `Nothing active`, `Nothing blocked`, `+ Add Work Item`, `Run all`, `Resolve all`, `Resolve`, `Resolving`, `Waiting for <numero breve> <titolo>`.

## Scelte fatte da me, da controllare

- Testi minori: tooltip di `Run all` «Run all the Tasks in To do», di `Resolve` «Ask an agent to resolve this Drift», dell'icona dei Drift multipli «Also blocked by <numeri brevi degli altri Drift>», del badge «An agent is resolving this Drift», del tag «From Proposal <id>: <titolo>»; nel pannello tornano i motivi «No Task is in To do» e «All the Tasks in To do are blocked: …», perché la colonna Ready non c'è più.
- L'etichetta si scrive con `trama proposal new … --label` o `trama proposal label <id> <testo>`; le Proposal consegnate prima delle etichette non sono bloccate e i loro Task usano come tag il titolo della Proposal.
- Il colore del tag è uno di sei colori ANSI del tema, scelto da un hash dell'etichetta; con la riduzione del movimento il bordo animato resta fermo, ciano.
- Il Diagramma non riceve `Resolve`: nei dettagli di un Drift resta solo `Dismiss Drift`.
- La riga di comando non cambia: `trama board` raggruppa ancora i Task per design e `trama task next --proposal` resta, anche se nessuna istruzione lo usa più.
- I ghost passano da `ui/board.md` al nuovo frammento `ui/ghosts.md` (sezione `announcement`), così `ui/board.md` resta sotto i 12 KB.
