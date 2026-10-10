---
status: approved
requires:
  - o3h29jss
base:
  actors/agent.md: 85dd59a1b57135edc4cd54efa02e773711b927e3c92e909ac1a77fb3e7674cf5
  work/drift.md: 706b1e6a4e3193acf66570f38fbc221da6171db63f61cecd388db5e560f6ce61
  model-changes/proposal.md: 09cec6a5b5693e40d0c5d98958d82b23a01c02abad8e299a7673755e9486e650
  editor-panel/panel.md: 3c40f1abd185747e99c93ec8a2a1541fdd273d2c0ba50bce7fc94d2de840f132
  work/task.md: 8e25020b94b196944dc31182f49c00c507e2dd58f083f12569efc3a8faeaaa83
  requirements/tech/agent-terminal.md: 6b36d4dbb7ebf1b86b189edb5881cd1e46254d6b5519d1ca68be32ffda667be8
  requirements/tech/editor-chat.md: d076e0fd60e88b8d959621b625fb98dc5521ec102c37de9982827f62dab6eac8
  requirements/tech/general.md: b6be7f16f4ed37bc0e82d66059f2ed82b0ebff061755a4f9d364973976f73373
  requirements/tech/work.md: 68c36230a52832d285ce69c49eb310582d5a90bfa01d1baec0885b0e3845947e
  requirements/rules/general.md: 7d7db119daa09321c2cc10d953ac02b83e5c02ddbe61f432c6088ba824d13367
  requirements/rules/tasks.md: 08ec6c74a8b6cf6bab084f3e72f8bae3a137311da757053f3d883a26a78b726d
  requirements/rules/project.md: a57b963be3b50451bc65a0f330228ede36de938d0555f406be9ca92df3b7aeef
  requirements/rules/decisions.md: d970c79a9825f33f9162764317348fdf239a92208b0e0d5ee989d71f13f5fae2
  requirements/ui/board.md: a8ea0a3a6a4973311ffdaabfa6211152f7949a09d6350d6fe239ad1ec012a5fc
  requirements/ui/work.md: f5e784633f563d454165404cc6f18b684f63b0d5a884d5e64269cc0a20a06af6
  requirements/data/work.md: 639f45e78c4fa9c28c673a25febdffc672c74b8c547d596a65ceac4583103c1a
delete: []
created: 2026-10-10T12:35:05.350Z
scanScope:
  - ref: agent
    reason: changed
  - ref: panel/Board
    reason: changed
  - ref: proposal
    reason: changed
  - ref: drift
    reason: changed
  - ref: task
    reason: changed
  - ref: panel/Open/developer.SHOW_BOARD
    reason: leads into a change
  - ref: requirements/data#task
    reason: changed
  - ref: requirements/rules#proposal
    reason: changed
  - ref: requirements/rules#General
    reason: changed
  - ref: requirements/rules#project
    reason: changed
  - ref: requirements/rules#task
    reason: changed
  - ref: requirements/tech#agent-terminal
    reason: changed
  - ref: requirements/tech#editor-chat
    reason: changed
  - ref: requirements/tech#General
    reason: changed
  - ref: requirements/tech#project
    reason: changed
  - ref: requirements/tech#drift
    reason: changed
  - ref: requirements/ui#panel/Board
    reason: changed
  - ref: requirements/ui#drift
    reason: changed
  - ref: requirements/ui#proposal
    reason: changed
---
# Developer decisions by instruction and unified yellow resolution card

Terza Proposal della richiesta di design «Rimozione feature di prova», sopra la Proposal o3h29jss.

Decisioni prese nell’intervista:
- Si toglie solo il rifiuto automatico dei comandi riservati al developer: approve, reject, discard, drift resolve, task take-back e ids rewrite funzionano anche quando li esegue un agente, senza avvisi aggiuntivi. Restano i segni che riconoscono agente, terminale e chat per i Task presi e gli annunci.
- Le skill insegnano all’agente a eseguire queste decisioni solo su richiesta esplicita del developer nella conversazione; senza richiesta si ferma e gli chiede di decidere. Le altre condizioni dei comandi non cambiano.
- Una Proposal di risoluzione consegnata e i Drift aperti che elenca sono una sola scheda gialla in To decide: stessa scheda della Proposal di oggi, con titolo, file e righe dei Drift e delle decisioni; le righe portano ai dettagli dei Drift nel Diagramma.
- Mentre la risoluzione è Draft, i Drift restano schede rosse e il ghost mostra la scrittura. Alla consegna le schede rosse dei Drift elencati spariscono; se la risoluzione torna Draft, è rifiutata o scartata, tornano rosse. L’approvazione decide comunque l’intera Proposal e tutti i Drift ancora aperti che elenca.
- Le Proposal allegate ai Drift restano materiale dell’agente, senza scheda propria. Non si aggiungono i due lati dei Drift alla scheda gialla: resta minimale.

Scelte mie da verificare: il conteggio di To decide e della tab Board conta la scheda unificata una volta, non anche i Drift che contiene; i Drift restano aperti, bloccano i Task e si vedono nel Diagramma fino alla decisione.
