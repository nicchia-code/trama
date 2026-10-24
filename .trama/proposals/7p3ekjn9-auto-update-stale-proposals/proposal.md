---
status: open
base:
  agent-launching/raffinamento.md: new
  model-changes/proposal.md: 33998829510aa695e7a8f99462d68c354560a7c2b45369db92ebb80507987b29
  actors/developer.md: 5c74b74d7a1dc63c4b049b4b4098231035b957ebf923452a7ede2609d0b0d4cc
  agent-launching/feature.md: 5deb0a6853fb3c68ad32c95fffbcc69cd7663092cbf0c80989e9e19345ee2259
  editor-panel/panel.md: abf95a9197a0340b4f53ca650ac64bc9e5ad442a6adb30631be1993a8f46392e
  requirements/rules/raffinamento.md: new
  requirements/ui/raffinamento.md: new
  requirements/tech/raffinamento.md: new
  requirements/data/raffinamento.md: new
  requirements/quality/raffinamento.md: new
  requirements/ui/settings-specs.md: 3905a1cca8b1726efa4ece047a5b52392c0ddf6c95a27b8627c7f82508896f5f
  requirements/ui/board.md: fdf43b02c10d743ce0246f4cae73807bd0b020b1721f22008259fc4d1f11511e
  requirements/rules/setup-wizard.md: b21a5f8b9de891aa7043c2714f42047c27eacf1391693eb4efd39f95c11fe6cc
  requirements/rules/decisions.md: a542d79e622a56ec2b5f253c2021b2eb7e9ad42d4c389a84ec2b688706cb53bb
delete: []
request: 2026-10-24T08-02-21
created: 2026-10-24T06:27:41.319Z
label: Auto-update Stale
---
# Auto-update Stale Proposals

Scrivere più design di fila oggi li rende obsoleti: l'approvazione di uno cambia file del Modello o dei Requisiti che anche gli altri toccano, e una Proposal obsoleta non si approva più e va rifatta da capo. Auto-update Stale Proposals, una funzione nuova del gruppo Features, spenta per impostazione predefinita, fa adattare da un agente la Proposal obsoleta al Modello di adesso quando il developer preme Approve, e poi la approva, così i design in fila non perdono il loro lavoro.

## Decisioni

- Nome della funzione: Auto-update Stale Proposals (`trama.autoUpdateStaleProposals`), nel gruppo Features, spenta finché il developer non la accende, solo nelle impostazioni utente. Descrizione breve: «On: a stale design Proposal shows `to refine`; Approve adapts it to the current Model and then approves it.»
- Vale solo per le Proposal ordinarie non allegate a un Drift; import, setup e risoluzioni restano obsolete come oggi.
- Con la funzione accesa una Proposal ordinaria obsoleta ha il chip `to refine` al posto del badge `stale`.
- L'azione è `Approve`: premuto su una Proposal `to refine` avvia il raffinamento invece dell'approvazione rifiutata.
- Il raffinamento lavora sulla stessa Proposal: tiene identità, numero breve, posto in Backlog, modello scelto, immagini dei Task e le `requires` delle altre; Trama riallinea il punto di partenza dei suoi file a quelli di adesso.
- Lo scan selettivo legge solo il Modello e i Requisiti di adesso dei file cambiati, più i Drift aperti sugli elementi che la Proposal tocca; non legge il codice.
- Domande: solo se necessario, al più un round, quando il Modello di adesso contraddice una decisione già presa nel design.
- Alla fine, consegnata e non bloccata, la Proposal è approvata da sola con i suoi Task; bloccata per un altro motivo resta Open con il motivo.
- Modello dell'agente: il ruolo `trama.analysis`, come il design e Rework with feedback.
- I raffinamenti partono uno alla volta, in coda nell'ordine del Backlog.
- Durante il raffinamento la scheda resta al suo posto con il badge `refining`, la fase e l'ultima nota dell'agente, e il bordo animato blu-ciano del Task preso dall'agente; `Approve` e `Reject` disabilitati.
- Una Proposal in coda ha il badge `queued` e un pulsante `Cancel` che la toglie dalla coda e la riporta a `to refine` senza rifiutarla. `Cancel` vale solo in coda, non per il raffinamento in corso.
- Raffinamento interrotto prima della consegna: la scheda torna a `to refine` e `Approve` riprende dalla Draft.
- Di nuovo obsoleta dopo la consegna: rientra in coda da sola, senza un nuovo clic.
- Modifica già tutta nel Modello di adesso: l'agente non la approva e apre un round di domande di Trama che spiega la situazione con due scelte, `Remove` (la rifiuta) e `Keep` (la lascia com'è, con `to refine`).
- La coda vive nella finestra dell'editor e non sopravvive a un riavvio: le Proposal in attesa tornano a `to refine`.

## Assunzioni da verificare

- Nel round `Remove`/`Keep` la raccomandata è `Keep`, così un round saltato o perso non rifiuta nulla.
- Il raffinamento non parte su una Proposal bloccata anche da una Proposal che richiede e che non è approvata, né mentre il suo agente sta ancora finendo il turno: `Approve` resta disabilitato con quei motivi, come oggi.
- Spegnere la funzione svuota la coda (le Proposal tornano `stale`); il raffinamento in corso finisce e viene approvato come gli altri, perché il developer aveva già premuto `Approve`.
- Il terminale del raffinamento si chiama `Refine <numero breve>` e non è un Run né una risoluzione: non ferma e non è fermato da Run, Resolve, Unify Drifts, scan, design e import.
- Il riallineamento lo fa l'agente con `trama proposal edit <id>` e `rebase: true`, che riporta la Proposal a Draft, registra di nuovo il punto di partenza di ogni file e scrive `refining: true` fino alla consegna riuscita; con la funzione accesa una Draft con `refining: true` ha una scheda in Backlog.
