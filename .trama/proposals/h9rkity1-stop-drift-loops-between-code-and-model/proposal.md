---
status: approved
base:
  work/drift.md: 099c78a3db1dbdc5fd88066295de6ff15c89aac485f15a49bc023f955805de73
  requirements/rules/drifts.md: 9a267c8e2b57ed1b35a20dba5fcbd5076072b6ee72fe5209135634a20c9ba575
  requirements/rules/autopilot.md: e92b258ad54a77cb06f9c16aad8c539a29916e2f27118daae2ce4ed7027bdb09
  requirements/rules/questions-notices.md: 003d13b30e570a74bc3c2be920f24dcfca145f4dd15a6f7ae366241988ad0517
  requirements/data/work.md: 713e401ffe5e07f856976cb6c97d0a198ba851800208a035cafc0a431edd2969
  requirements/tech/work.md: 8008d635091fc826648e9afda6b0dda5a20d7ba359de25cf090f5e5d8cbc8878
  requirements/ui/work.md: 1b270090bf89d488d08ecd11ac6d878cad3a55018877f7897563748863f89a03
  requirements/quality/main.md: bd8d95cdfaac9dc4f666b83610007effcd1adfbad1284b7f9db0a520ef81eee2
  agent-launching/drift-resolution.md: d47594ae83ad2c863fe497d598cca4109f0536982c8dc035b158793fb256a853
  requirements/data/proposals.md: new
  requirements/tech/drifts.md: new
delete: []
request: 2026-10-12T19-41-04
created: 2026-10-12T18:17:32.907Z
scanScope:
  - ref: drift-resolution
    reason: changed
  - ref: drift-resolution/Free
    reason: changed
  - ref: drift
    reason: changed
  - ref: drift/Open
    reason: changed
  - ref: drift-resolution/In attesa delle scansioni/drift-resolution.SCAN_BARRIER_CLEARED
    reason: leads into a change
  - ref: drift-resolution/In attesa delle scansioni/developer.SET_DRIFT_AUTOPILOT
    reason: leads into a change
  - ref: drift-resolution/Running tasks/agent-hook.IDLE
    reason: leads into a change
  - ref: drift-resolution/Running tasks/terminal.COMMAND_ENDED
    reason: leads into a change
  - ref: drift-resolution/Running tasks/terminal.CLOSED
    reason: leads into a change
  - ref: drift-resolution/Running tasks/editor-chat.AGENT_STOPPED
    reason: leads into a change
  - ref: drift-resolution/Running tasks/editor-chat.AGENT_INTERRUPTED
    reason: leads into a change
  - ref: drift-resolution/Running tasks/editor-chat.CONVERSATION_CLOSED
    reason: leads into a change
  - ref: drift-resolution/Resolving/agent-hook.IDLE
    reason: leads into a change
  - ref: drift-resolution/Resolving/terminal.COMMAND_ENDED
    reason: leads into a change
  - ref: drift-resolution/Resolving/terminal.CLOSED
    reason: leads into a change
  - ref: drift-resolution/Resolving/editor-chat.AGENT_STOPPED
    reason: leads into a change
  - ref: drift-resolution/Resolving/editor-chat.AGENT_INTERRUPTED
    reason: leads into a change
  - ref: drift-resolution/Resolving/editor-chat.CONVERSATION_CLOSED
    reason: leads into a change
  - ref: requirements/data#drift
    reason: changed
  - ref: requirements/quality#drift-resolution
    reason: changed
  - ref: requirements/rules#drift-resolution
    reason: changed
  - ref: requirements/rules#drift
    reason: changed
  - ref: requirements/rules#question-round
    reason: changed
  - ref: requirements/tech#drift
    reason: changed
  - ref: requirements/ui#drift
    reason: changed
---
# Stop Drift loops between code and Model

Il developer osserva che, col tempo, la correzione dei bug diventa un'alternanza senza valore fra «correggi il codice secondo il Modello» e «correggi il Modello secondo il codice». I dati del progetto lo confermano: su 253 Drift, 227 risolti correggendo il codice; dei 30 Drift archiviati durante un'implementazione, 27 sono nati realizzando il Task di correzione di un altro Drift (per esempio la catena di 5 Drift in 20 minuti su `requirements/tech#announcement`). Le cause: Fix option che in realtà chiedono di derogare a un Requisito, nessuna memoria delle differenze già decise e una delega che ripete i cicli senza limite.

Decisioni prese nell'intervista:
- Ogni Fix option raggiunge ciò che dovrebbe succedere senza cambiare Modello o Requisiti; se la via giusta richiede un cambio, l'agente allega una Proposal.
- Quando nessuna correzione del codice rispetta Modello e Requisiti insieme (per esempio due Requisiti in contraddizione), il Drift nasce senza Fix option e con una Proposal allegata; la regola «da 2 a 5 opzioni» vale per tutti gli altri.
- Un Drift nato realizzando il Task di correzione di un altro Drift ricorda quel Drift come precedente ed è ricorrente: la delega non lo risolve mai, in nessuna modalità.
- Una differenza già corretta (o già adeguata nel Modello) che una scansione ritrova è anch'essa un Drift ricorrente, con lo stesso trattamento.
- Il precedente è ricavato da Trama quando l'origine è un Task di correzione; altrimenti l'agente lo dichiara alla creazione, e dev'essere un Drift risolto.
- La scansione legge i Drift risolti sugli stessi elementi prima di archiviare e non riarchivia una differenza dismessa finché Modello o Requisito dicono la stessa cosa.
- `trama drift list` filtra per riferimento con `--ref` ripetibile, con la regola «stesso elemento o uno dentro l'altro» già usata per i blocchi.
- Sulla Board un Drift ricorrente ha il badge testuale `recurring`, con tooltip e nome accessibile che nominano il precedente.
- Nel round di Resolve Drifts la domanda su un Drift ricorrente elenca nel contesto i Drift precedenti della catena con titolo e decisione.
- I Requisiti restano un contratto: nessuna soglia nuova per i Drift contro i Requisiti.
- Nel round di Resolve Drifts la domanda su un Drift senza Fix option con Proposal allegata offre due opzioni: adottare la Proposal (raccomandata) o chiudere senza cambiare nulla.

Derivazione non chiesta esplicitamente, da verificare: un Drift dismesso non ha un seguito ricorrente, perché la sua differenza non si riarchivia; vale come ricorrente la differenza ritrovata dopo una correzione del codice o dopo un adeguamento del Modello.

Per restare sotto i 12 KB, i frammenti `data/work` e `tech/work` sono divisi senza cambiare il testo spostato: `data/proposals` prende annunci e Proposal, `tech/drifts` prende i Drift.
