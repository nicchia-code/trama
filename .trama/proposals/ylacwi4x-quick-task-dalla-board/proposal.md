---
status: approved
base:
  actors/developer.md: e2da989a0f4113a45396dd87f3affb34af51ae227553d6b8ecdbf58d9e7adcd0
  editor-panel/panel.md: b009b71ed222e7bb5f7ce2ba0ef7c3d3e288aba97f81fc89e860b3758981bdf6
  agent-launching/agent-terminal.md: 57a088f71b550e390c0c83301393530f3d999cfed9f957d6315b8819eb8e7de3
  work/announcement.md: d8ae0a57684dd76d29ba08adc120c5f84441e0f2811cbb50b61f7d3b9de976f6
  agent-launching/feature.md: d4d2a3378509da177cee508c1750ccc8fdbb1d57d07d8ea88b82eaf334549355
  requirements/ui/board.md: 78d91800cb2496f7eee7271cae79c404c62b1110d85fc2bc0bac2090f7faa69f
  requirements/ui/panel.md: 149ed6b89d682e27d2e53ed6dd96a54ba1489aa09c96f90e94f39f035d9e40e7
  requirements/ui/quick-task.md: new
  requirements/rules/quick-task.md: new
  requirements/tech/quick-task.md: new
  requirements/rules/agent-terminal.md: a016151dbe135cf84ecb9f7a6619871e47a9ef5ccfb9a48d70b208be120b3ddc
  requirements/tech/agent-terminal.md: 136fb300f56ac33bcdc2a3c1b4915cdc677dcd532c7c081f201d6f346787f598
delete: []
request: 2026-10-22T06-47-50
created: 2026-10-22T05:05:05.789Z
label: Quick Task
---
# Quick Task dalla Board

Il developer vuole un modo rapido per affidare all'agente un lavoro piccolo e di fiducia (per esempio «committa il codice»), senza richiesta scritta, scan, Proposal, Task né controlli. + Add Work Item diventa un pulsante diviso: la freccetta a destra apre verso l'alto un menu con «Add Quick Task», che apre subito una chat nuda con l'agente, dove il developer scrive e continua a parlare come vuole.

## Decisioni
- + Add Work Item diventa un pulsante diviso: la parte principale apre la richiesta di design scritta come oggi; a destra una freccetta `ChevronUp`, con tooltip e nome accessibile «More ways to add work».
- La freccetta apre verso l'alto un `DropdownMenu` di shadcn/ui (Radix, già nelle Specs) con la sola voce «Add Quick Task», tooltip «Ask an agent for a quick job, without scans or cards».
- Add Quick Task non chiede nessun testo: apre subito una chat nuova con l'agente scelto in `trama.agent`, e il developer scrive lì (idea del developer: «apriamo la chat e gg, se la vede l'utente»).
- La chat è nuda: nessuna istruzione, nessun system prompt aggiunto, nessuna skill `trama-quick`; l'agente vede solo ciò che scrive il developer, con le skill e le regole che carica da sé.
- Se il developer lo chiede, l'agente può usare anche i comandi di Trama; nessuna regola di Trama glielo impone o glielo vieta.
- Con omp: un terminale nuovo chiamato «Quick», che si mostra e prende il focus (eccezione alla regola dei terminali dell'agente), con le variabili di Trama degli altri terminali tranne quella dell'Advisor Scanner, senza hook.
- Con omp un ghost di lavoro «Quick» in System Activities dall'apertura del terminale alla sua chiusura o all'uscita di omp; sparisce senza avvisi.
- Con la chat di Cursor: una conversazione nuova e vuota, con il focus, che Trama non segue; nessun ghost.
- Con la chat di Cursor in un editor che non è Cursor: lo stesso avviso delle altre istruzioni, senza nulla negli appunti; non si apre nulla.
- Se Cursor non riesce ad aprire una conversazione nuova: avviso «Trama: could not open a new Cursor chat.», nessun ghost.

## Assunzioni (domande saltate dal developer, da rivedere)
- Un Quick Task può partire sempre, anche durante un Run o una risoluzione di Drift, e non blocca nulla: non conta per `trama.submitWhileRunning`, `Run all` né `Resolve`.
- Il modello è quello del ruolo `trama.execution`, come i Run.
- Nessuna delle frasi aggiuntive delle istruzioni (limite dei sotto-agenti, confronto con trama-analysis, `--slow`, funzioni sperimentali, Advisor Scanner, lingua, domande) e nessun overlay `--config` (nemmeno l'esclusione dei file di istruzioni): non c'è istruzione.
- Il menu ha solo «Add Quick Task»; la parte principale non si ripete nel menu.

## Already present
- `panel/Open/developer.SHOW_BOARD` — extension/src/webview/main.tsx:navigate (scheda Board del pannello)
