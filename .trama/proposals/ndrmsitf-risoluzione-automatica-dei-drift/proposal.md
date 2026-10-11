---
status: approved
base:
  system.md: 54b9341d6e9d70c771000d1c8ee66f8dbb8b8d7cf722ad2204cc886ff5fffa75
  work/feature.md: e6b7384bd584cd2131a0f629394278b475fa25c3a2406e34625de1fbcda3b4d2
  work/drift.md: f988b5cce796ca0fdaa32bea77263c5d4030e69bcd9465560579e7ebdd06dfdf
  actors/agent.md: 5f47dc568429b0200ddba526ee68e6bdeddc1ca24e57fd0ff33d4bc861f6b573
  agent-launching/feature.md: 2306636ea3ac86141a265e687fcad75e0064588358c6f2c956d41d30137cc95a
  agent-launching/agent-terminal.md: ee17a5ffc23036a5494ca183ae12194f31430253f9cd367fc91fb550526392c4
  agent-launching/drift-resolution.md: 3f793f2b71fec2ff3307b74e62078b3edb66c4257ad721b0193d4d32f611beb7
  model-changes/proposal.md: 20d5d5dc452e4a3cbfd0d5c045ae379e53e50a2f1a9c3102049bdb1de86e879d
  requirements/data/work.md: 91f9f03a3ffde2f012600c00b14e687698028f144d68fe4d4cc367c078f3258e
  requirements/data/agents.md: d4612ed941289fd6d2817c14fd43d94dd80a3eebf63e9dbe40028136ac0ebfcc
  requirements/rules/drifts.md: 724005ffe0c6e28fb8892b77b9620115b269decf569207f19619b78fbdec7631
  requirements/rules/general.md: 4aed9e5b55f30072cf2f796b3547f662a2695269d83eff64c8acb80b4b777d65
  requirements/rules/decisions.md: 7d022696873b5b56f46ce8d9e382b94fe0fa405f1cecbb4cc4f58649cbf316ed
  requirements/rules/models.md: f380c8f341ca71506650c4dbf935ce6dd67f8dd191ab1ade7bd1fcf0f54d5fbf
  requirements/tech/general.md: 4e1e831819a037d7d5aadd4b7d854dd0ff0851008ad73c52906775cea79f43de
  requirements/tech/work.md: cbb2366445d218e9bf7214d9b8ee8b2101f0e3cb355d605e563be9c3c0e62726
  requirements/tech/autopilot.md: new
  requirements/ui/work.md: 77bddb77aee40b71828fb467eb56f3e2f84f6c8a791fee76ddf3c74b5e9c08c6
  requirements/ui/agents.md: a576f1ea14472b2e6d41f5f7d9d0f46824784caf3105a959b811c68429470749
  requirements/quality/main.md: 30309fb53655e0712e6230d65e1702ce0d4c500ff264300bfb7a9b9867f67e3e
  requirements/rules/autopilot.md: new
  actors/developer.md: a341d5c144df31b6bfdaea7c3d50d98bcedc79667d121b5c650cdd8380355b9f
  requirements/rules/announcements.md: 5ea9486df88f4bc3beebe6555940cf9f6fc31e011506f0208f88b93bf578682c
  requirements/tech/announcements.md: a3c93bf7b36280c381fc835c232dad00aa2d361be2d2879198da25a942eb4985
  requirements/rules/agent-terminal.md: 476e0a35fe5ea911c79bfaf2c69320651c2abd683f418d2ece89f4478facb871
  requirements/rules/requests.md: new
delete: []
request: 2026-10-10T21-56-57
created: 2026-10-10T20:18:59.123Z
scanScope:
  - ref: agent-launching
    reason: changed
  - ref: work
    reason: changed
  - ref: agent
    reason: changed
  - ref: agent.FINISH_CHECK
    reason: changed
  - ref: developer.SET_DRIFT_AUTOPILOT
    reason: changed
  - ref: agent-terminal
    reason: changed
  - ref: drift-resolution
    reason: changed
  - ref: drift-resolution/Free
    reason: changed
  - ref: drift-resolution/In attesa delle scansioni
    reason: changed
  - ref: drift-resolution/Running tasks
    reason: changed
  - ref: drift-resolution/Resolving
    reason: changed
  - ref: drift-resolution/Sospeso
    reason: changed
  - ref: drift-resolution.COLLECTION_STARTED
    reason: changed
  - ref: drift-resolution.AUTOMATIC_APPROVAL_GRANTED
    reason: changed
  - ref: drift-resolution.AUTOMATIC_RUN_STARTED
    reason: changed
  - ref: drift-resolution.SCAN_BARRIER_CLEARED
    reason: changed
  - ref: proposal
    reason: changed
  - ref: proposal/Open/drift-resolution.AUTOMATIC_APPROVAL_GRANTED
    reason: changed
  - ref: drift
    reason: changed
  - ref: drift/Open
    reason: changed
  - ref: drift/Code to be fixed
    reason: changed
  - ref: announcement/Checking/agent.FINISH_CHECK
    reason: leads into a change
  - ref: requirements/data#drift-resolution
    reason: changed
  - ref: requirements/data#drift
    reason: changed
  - ref: requirements/data#announcement
    reason: changed
  - ref: requirements/data#proposal
    reason: changed
  - ref: requirements/quality#agent-launching
    reason: changed
  - ref: requirements/quality#drift-resolution
    reason: changed
  - ref: requirements/rules#agent-terminal
    reason: changed
  - ref: requirements/rules#announcement
    reason: changed
  - ref: requirements/rules#drift-resolution
    reason: changed
  - ref: requirements/rules#proposal
    reason: changed
  - ref: requirements/rules#drift
    reason: changed
  - ref: requirements/rules#General
    reason: changed
  - ref: requirements/rules#agent-launching
    reason: changed
  - ref: requirements/tech#announcement
    reason: changed
  - ref: requirements/tech#drift-resolution
    reason: changed
  - ref: requirements/tech#General
    reason: changed
  - ref: requirements/tech#task
    reason: changed
  - ref: requirements/tech#drift
    reason: changed
  - ref: requirements/ui#agent-launching
    reason: changed
  - ref: requirements/ui#drift
    reason: changed
  - ref: requirements/ui#drift-resolution
    reason: changed
---
# Risoluzione automatica dei Drift

Automatizzare la risoluzione dei Drift ovvi senza cambiare il significato delle decisioni urgenti né aggirare i controlli del progetto.

Decisioni confermate nell'intervista:
- `trama.driftAutoPilot` ammette `disabled`, `enabled` e `yolo`; il valore predefinito è `disabled`.
- La preferenza vale solo nelle impostazioni utente, per tutti i progetti; il repository non può attivarla.
- `disabled` conserva il comportamento attuale; `enabled` automatizza i Drift non critici; `yolo` automatizza anche quelli critici.
- Un Drift è critico solo se è urgente che il developer prenda posizione, non per la sola gravità tecnica. Lo classifica chi lo registra, in tutte le modalità; nei Drift precedenti `critical` assente vale `false`.
- La scelta automatica è sempre la prima Fix option archiviata, non una nuova raccomandazione che possa adeguare il Modello al codice.
- L'automatismo parte da solo per tutti i Drift aperti ammissibili, indipendentemente dall'origine: sceglie, prepara e consegna una risoluzione, la approva ed esegue le correzioni e i Task di origine ancora da completare. Non prende Task estranei.
- Prima di iniziare una raccolta attende tutti gli scan e i Run lanciati da Trama sul progetto, anche in altre finestre; un solo automatismo opera sul progetto. Gli agenti avviati senza Trama non entrano nella barriera.
- La raccolta viene fotografata all'avvio; uno scan avviato dopo non interrompe la risoluzione già partita e i suoi Drift aspettano il ciclo successivo.
- In `enabled` i non critici sono aggregati in una risoluzione automatica separata dai critici manuali. Premendo Resolve Drifts si applica la modalità attiva; in una raccolta mista si affrontano prima i casi manuali e poi gli automatici.
- I Drift critici trattati manualmente in `enabled` conservano anche il lancio manuale dei loro Task.
- Uno scan fallito o interrotto sospende nuove raccolte automatiche fino a uno scan riuscito o un lancio esplicito; i Drift archiviati restano aperti. Il riavvio dell'editor richiede la stessa ripresa esplicita o uno scan riuscito, senza ripartenza immediata.
- Un Drift senza Fix options resta al flusso manuale anche in `yolo`. Una scelta non applicabile o una correzione fallita non viene sostituita con una scelta inventata: proseguono solo i casi indipendenti.
- I casi falliti o esclusi non vengono ritentati da un ciclo automatico: serve Resolve Drifts, una modifica del Drift o una nuova scansione avviata dal developer. Le eccezioni possono ricevere domande manuali anche in `yolo`, senza aggirare i controlli.
- Dopo correzioni e ripresa delle origini, i controlli previsti e lo scan di fine corsa possono produrre altri Drift: l'automatismo ripete i cicli finché restano casi ammissibili, senza un limite aggiuntivo. Il developer accetta il rischio di cicli ripetuti su correzioni instabili.
- La modalità viene riletta prima di ogni scelta, approvazione e nuovo Run. Passare a `disabled` impedisce nuovi passi automatici, ma non interrompe forzatamente un Task già avviato.
- La Board mostra modalità, attesa, lavoro ed errore; i Drift critici hanno un indicatore testuale, visibile anche nella CLI. Poiché i dati precedenti valgono non critici, non serve uno stato persistente di classificazione sconosciuta.

Nessuna domanda saltata; nessuna decisione assunta al posto del developer. Questa Proposal progetta l'automatismo futuro e non autorizza l'approvazione di se stessa né la risoluzione dei Drift attuali.
