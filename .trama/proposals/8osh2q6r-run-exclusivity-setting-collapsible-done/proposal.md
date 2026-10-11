---
status: approved
base:
  agent-launching/drift-resolution.md: 0c0ae1bf5d3b04387a5f9b0e7026fee24243ea7953bd9788b80de5b2eef1f537
  editor-panel/panel.md: 3e7410969b977490dd6679dd9d587872acde664d27d72d7817297bd09937da13
  requirements/rules/autopilot.md: e8695551bafe0e4615d177dc4f205a3e9816a2d409f0261a12a3db26db45d38b
  requirements/rules/announcements.md: 9c94a72f139fd3ae934ae172eae4f5abe9368e47b51c65a2ae2415f53da7d729
  requirements/rules/tasks.md: 65d55aa1358103051aded4935db439eca7b0322e3d723a3e59f7a3cf4d6b470c
  requirements/data/agents.md: 8703a24ae391603c7bc835fc9ed7d49941a89568c18b347e568b47e7eb47d582
  requirements/quality/main.md: 4fa847a252381db64dfd61b446a211d1af4d151be69a14459534c76b7b9f3cfc
  requirements/ui/board.md: 9947b4ec96b6a58f93c72727465691e4d6c5ea541474d70b44374f2ab87ad57f
  requirements/ui/work.md: 1b270090bf89d488d08ecd11ac6d878cad3a55018877f7897563748863f89a03
  requirements/ui/agents.md: 1b505a11e668f5d7f2d2fddbb56255a6f662347a06b2ab089689674ebeb9a5e8
  requirements/tech/agent-terminal.md: 4a7f3203ea44a136491bf664e1f1008092e0504343cee79a0b88d79ea9f1dd04
delete: []
request: 2026-10-11T06-24-05
created: 2026-10-11T04:36:31.775Z
scanScope:
  - ref: drift-resolution
    reason: changed
  - ref: drift-resolution/Free/developer.ASK_AGENT
    reason: changed
  - ref: drift-resolution/Free/drift-resolution.SCAN_BARRIER_CLEARED
    reason: changed
  - ref: drift-resolution/Free/developer.SET_DRIFT_AUTOPILOT
    reason: changed
  - ref: drift-resolution/In attesa delle scansioni/agent.FINISH_CHECK
    reason: changed
  - ref: drift-resolution/In attesa delle scansioni/drift-resolution.SCAN_BARRIER_CLEARED
    reason: changed
  - ref: drift-resolution/In attesa delle scansioni
    reason: removed, its container
  - ref: drift-resolution/Running tasks/agent.FINISH_CHECK
    reason: changed
  - ref: drift-resolution/Resolving/agent.FINISH_CHECK
    reason: changed
  - ref: drift-resolution.SCAN_BARRIER_CLEARED
    reason: changed
  - ref: panel/Board
    reason: changed
  - ref: panel/Open/developer.SHOW_BOARD
    reason: leads into a change
  - ref: requirements/data#drift-resolution
    reason: changed
  - ref: requirements/quality#drift-resolution
    reason: changed
  - ref: requirements/rules#announcement
    reason: changed
  - ref: requirements/rules#drift-resolution
    reason: changed
  - ref: requirements/rules#task
    reason: changed
  - ref: requirements/tech#agent-terminal
    reason: changed
  - ref: requirements/ui#agent-terminal
    reason: changed
  - ref: requirements/ui#agent-launching
    reason: changed
  - ref: requirements/ui#panel/Board
    reason: changed
---
# Run exclusivity setting, collapsible Done column, autopilot resilient to failed scans

Richiesta del developer: tre ritocchi indipendenti a Board, Run e autopilota dei Drift.

Decisioni prese nell'intervista:
- Nuova impostazione `trama.submitWhileRunning`, stringa con valori `enabled`/`disabled`, default `disabled`, impostabile da utente e workspace.
- Con `disabled` si bloccano i tre Run (Run di un Task, Run this design, Run all To do) mentre un Run lanciato da Trama non è finito; scan, design e import restano liberi.
- «In running» è la stessa nozione del motivo `A run is in progress` di Resolve Drifts (scan di fine corsa compreso), con i Run che la finestra conosce già: i propri, più quelli delle altre finestre quando il coordinatore dell'autopilota è attivo.
- I pulsanti bloccati appaiono disabilitati con tooltip `A run is in progress`, dopo `Drifts are being resolved` e prima degli altri motivi.
- Con `enabled` tutto resta come oggi.
- La colonna Done si apre e si chiude con un pulsante a sola icona (chevron) nell'intestazione; collassata è una striscia stretta con il titolo «Done» ruotato in verticale, senza menu del periodo e senza numero; le altre tre colonne si allargano.
- La scelta aperta/collassata dura la sessione del pannello: ogni apertura del pannello parte collassata.
- Uno scan fallito, o finito senza controllo dichiarato, non sospende più la delega dell'autopilota: conta come finito e la raccolta procede come dopo uno scan riuscito. Sparisce lo stato `Sospeso`.
- Restano le attese di ripresa dopo l'apertura dell'editor e la perdita del coordinatore, superate da uno scan concluso (con qualunque esito) o da Resolve Drifts.
- Nessun avviso nuovo per uno scan fallito: il motivo resta leggibile con `trama drift autopilot`.

Assunzioni:
- «Solo l'icona» vale per l'aspetto: il pulsante della Done conserva tooltip e nome accessibile `Expand Done column` / `Collapse Done column` e lo stato aperto/chiuso per le tecnologie assistive.
- I casi falliti di singoli Drift o Task dell'autopilota restano esclusi come oggi.
