---
status: approved
requires:
  - nr388hz3
base:
  specs.yaml: fa40a6df7b92ad321b08266eb345fabc9ad506da7b6d56071f55d176981c6d89
  actors/developer.md: 1b0dc71fbe33a8ec8cda7820e4b60c3a82d8f4a81e259a43f2cfb204c62f646f
  agent-launching/feature.md: 26047b3a8df702bd86d7f82eeed6264b4a2465920a4c73df2ba1cb607290266a
  agent-launching/agent-terminal.md: b17364e3baf458b7be38001df5d00728516a49f499cb75840830b0558fc5b7fa
  project-setup/setup-wizard.md: 4f9ee3e6ca950fef7279c74c50bf0fa6f41179eb4bbda05cf9d736283204e0da
  editor-panel/panel.md: be28d8d7449510de2de4b95d7ec3e88cb48be9927c278fc20eb3668e36aa11a1
  requirements/rules/agent-terminal.md: 6c73ae69fe4174866d3fe9979cba93ff60e2b382439827d5e70b20dbc227ba5b
  requirements/tech/agent-terminal.md: 10f363956407f4589f80f4d13358e43c7239cf3b365addea9a2a2a36e44e4bbc
  requirements/ui/agents.md: 8c27153612f4ae8f86b23dec0385d5e5728f932fd172f46e20d69797a7cf2e4f
  requirements/rules/setup-wizard.md: 0d23b01268346118f7dd4e081527a9a795860a203d782ecb1066524254504597
  requirements/tech/setup-wizard.md: aa6a6800ae5767a3c50d0d21ec542db51869ee8e620acaba4bb37c0d974ca8d7
  requirements/ui/get-started.md: 986ca059f4bdcae742150ebf5f97c5a3d9284c5e65af8f37d9ba3e731680d57f
  requirements/ui/settings-specs.md: 004a88c8b475c93241d949971dd8f8bd02847f9915df812afd283f0534640e8d
  requirements/tech/settings.md: c7c03017faaa8cfb714d5de1c5057fa55c1aa7326c0d557610b09c0f0dba82cc
  requirements/quality/agents.md: ddc0dff227803c93809592a1b4e57c4f7380ce1788a24147ae1dc8a612516ec4
  requirements/quality/instruction-files.md: aceb038ba7e29173ba8fb1597f5654da29a3267d6612149f068eb5c3c76f4da3
  requirements/tech/models.md: 7427f2bffa685695f59796be59820911546cf5b0786c2b6bf2c3ec2ae5559461
  requirements/quality/omp-chat.md: f0cd907e6c72337944439a5f10a5128e2e66a30d4820d0eeb425574b104ae774
  requirements/rules/omp-chat.md: 0b13344567f8b6a8ded386a2291abfe9d164ff2e964946dd88b8e759b37add26
  requirements/tech/instruction-files.md: 6e88a4bd559d52761bb6d1dd439e33219329e328e3024d32c309c97d238d2d19
  requirements/rules/omp-install.md: new
delete: []
created: 2026-10-23T13:55:24.878Z
label: omp install/update
---
# omp installato e aggiornato

omp è obbligatorio: il setup di Trama lo installa quando manca, dicendo al developer che è fondamentale, e Trama lo tiene sempre aggiornato con `omp update` prima di lanciarlo. Si appoggia sulla Proposal che toglie Cursor e rende omp l'unico agente.

Decisioni dell'intervista:
- Il passo del wizard e il gruppo della scheda Settings che si chiamavano Agent si chiamano omp.
- Nel passo omp, quando omp manca, il passo dice che è obbligatorio («omp is required: Trama runs every agent with omp.») e offre Install omp: Trama apre un terminale visibile con lo script ufficiale del sistema (`curl -fsSL https://omp.sh/install | sh` su macOS e Linux, `irm https://omp.sh/install.ps1 | iex` su Windows); alla fine del terminale la verifica si ripete. Next non è disponibile finché omp non risponde.
- Nel wizard, se omp c'è ma non è aggiornato, il passo lo aggiorna da solo e la riga della verifica mostra l'aggiornamento in corso, poi la versione nuova.
- Con `trama.ompPath` vuota Trama cerca `omp` nel PATH dell'editor, poi nelle cartelle in cui l'installer ufficiale lo mette (`~/.bun/bin`, `~/.local/bin`), per ogni uso di omp.
- Se omp manca quando Trama lancia un lavoro (design, scan, Run, Resolve Drifts, Unify Drifts, import, Ask more, Quick Task), il lavoro non parte: nessun terminale, nessuna conversazione, nessun annuncio; un avviso «Trama: omp is not installed. Trama runs every agent with omp.» offre `Install omp` (lo stesso terminale dell'installer) e `Open Settings`. Dopo l'installazione il developer rilancia il lavoro a mano.
- Prima di ogni lancio di omp, e nella verifica del wizard, Trama controlla con `omp update --check` se c'è una versione nuova; l'esito vale un'ora per tutte le finestre dell'editor, anche quando il controllo fallisce.
- Quando c'è una versione nuova il lancio aspetta: una notifica di avanzamento «Updating omp to <versione>…» accompagna `omp update`, poi il lavoro parte con la versione nuova.
- Se il controllo o l'aggiornamento falliscono (senza rete, gestore che rifiuta come Nix, errore di `omp update`), il lavoro parte con l'omp attuale e un avviso «Trama: could not update omp (<motivo>). The agent runs with omp <versione>.».
- La scheda Settings mostra nel gruppo omp una riga con la versione di omp, o il motivo per cui non risponde, e Install omp quando manca.

Conseguenza: per installare e aggiornare omp Trama lancia gli strumenti ufficiali di omp, che scaricano omp dalla rete; dal progetto non esce nulla.
