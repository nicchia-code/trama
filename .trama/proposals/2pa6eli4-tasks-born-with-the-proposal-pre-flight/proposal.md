---
status: approved
base:
  model-changes/proposal.md: b068a95dee434f0ad6f8159cd7aa27873de0cdff574f5e5742fa5a5a8974c530
  model-changes/feature.md: c1dcafd5b263167de074bb7884fe9f22c5841f0f99b4b21cc7d1f44131cc4e85
  agent-launching/feature.md: 22e5dfaf637db3e874ad060985ad969772f117b9de3f61debef3c5ef4f8e613d
  agent-launching/agent-terminal.md: 05cc109dc4d0d5eb74458d065ea1a55318ca67ec22316865ce00950805162240
  agent-launching/drift-resolution.md: 7206619a71fd44db93311bc6aad59bfb6ed4fd3d3f3bafaf83c0a9999a845f8a
  work/task.md: 1b66ca3135057d05447b855a40b61d192a7a6eaa3de37b22fe808f090caadea6
  work/announcement.md: 5e637cb8ad0df516620ecdee33810cfb20e50c1b4619e9573031c22a11f77f1d
  requirements/data/proposals.md: 50b49da857851a34169b245870b0ff3b89faa62a246bb36d8b5c74de4dc2fcf3
  requirements/quality/main.md: 822f1524f61a1c5ab5a8aa947651a09b7b14bcfbbf8b2d2c4c3eb91e7023baf5
  requirements/rules/agent-terminal.md: 47db42f63255aa7d2c819f63750987b149f566473cbc6894b8b65a4d8ace4de2
  requirements/rules/announcements.md: df5827496effa0dc74d1115b6fbd4341af71ad785e231a21f451a3e50bebd415
  requirements/rules/autopilot.md: 57daf3f839187bb35bff4a81532a008d0578239558492cc62e4c8c34a939bb9c
  requirements/rules/decisions.md: b66b5784a0f08570cad9970aa30561916658e2993a8de3d1d779eb3d3dc00cf6
  requirements/rules/models.md: 248d088aa4131de587a9fe1c96eb2be692db9831bb1acf7e68fefba403149442
  requirements/rules/tasks.md: 441b8c2bc62b5912baf711ede08214ac3986f976dec7c7607acd5e909ca5a8b8
  requirements/tech/agent-terminal.md: 9e242b141036569abb88c0a3b7ef962a0589b0345c6899d5ed6cc2c2cb8aa4ae
  requirements/tech/autopilot.md: 3e70e9063e1ad0eeb0fc97d285bafaf229298bddc631491db216c16c133d07a2
  requirements/tech/proposal.md: 7fbf0e6030e371a1e3f46f7c57a258a3b40743bb1de515af853c0ac31f65ee19
  requirements/tech/work.md: 3e9fab10c27fa0034749b0abc15e6b22751c640ef58bf104b14c64496dc4f9c1
  requirements/tech/general.md: 52b1896ff9685bbfb605a414788b7998474f8370ab87d6f0bd86929213bde385
  requirements/tech/project-panel.md: 8e7100c083ec9cdc417b60fb97e1d2311c28bdbd32add8df7bebddd857bec502
  requirements/ui/agents.md: 0210ce308fd31f943f3936e114a5ed63ae4f2dbd6f3e1c14ea3d375125596682
  requirements/ui/work.md: e021ba51a07c6fc199f3a1a67a91b0a57ea7986ecfbbba137e4e01b7b43d16ef
delete: []
request: 2026-10-14T09-10-30
created: 2026-10-14T08:26:42.678Z
scanScope:
  - ref: agent-launching
    reason: changed
  - ref: model-changes
    reason: changed
  - ref: agent-terminal
    reason: changed
  - ref: drift-resolution
    reason: changed
  - ref: proposal
    reason: changed
  - ref: announcement
    reason: changed
  - ref: task
    reason: changed
  - ref: project/Trama project/proposal.APPROVED
    reason: leads into a change
  - ref: drift/Open/proposal.APPROVED
    reason: leads into a change
  - ref: requirements/data#proposal
    reason: changed
  - ref: requirements/quality#task
    reason: changed
  - ref: requirements/rules#agent-terminal
    reason: changed
  - ref: requirements/rules#announcement
    reason: changed
  - ref: requirements/rules#drift-resolution
    reason: changed
  - ref: requirements/rules#proposal
    reason: changed
  - ref: requirements/rules#proposal/Approved
    reason: changed
  - ref: requirements/rules#agent-launching
    reason: changed
  - ref: requirements/rules#task
    reason: changed
  - ref: requirements/tech#agent-terminal
    reason: changed
  - ref: requirements/tech#drift-resolution
    reason: changed
  - ref: requirements/tech#General
    reason: changed
  - ref: requirements/tech#project
    reason: changed
  - ref: requirements/tech#proposal
    reason: changed
  - ref: requirements/tech#task
    reason: changed
  - ref: requirements/ui#agent-terminal
    reason: changed
  - ref: requirements/ui#agent-launching
    reason: changed
  - ref: requirements/ui#proposal
    reason: changed
---
# Tasks born with the Proposal, pre-flight scan before every Run

Oggi, dopo l'approvazione di una Proposal ordinaria, parte uno scan automatico che legge il codice e archivia i Task: è lento. Con questa modifica i Task nascono con la Proposal, l'approvazione li crea senza agente, e il codice si legge solo quando serve davvero: uno scan leggero del design prima della consegna e un pre-flight all'inizio di ogni Run.

Decisioni prese nell'intervista:
- Il design scrive i Task con `trama proposal edit <id> tasks/<slug>.md`, un file per Task nella cartella della Proposal; ogni modifica riporta la Proposal in Draft, come per gli altri file.
- Per un Task nuovo Trama assegna l'identità permanente, creando il file in modo esclusivo (`tasks/<identità>-<slug>.md`), unica anche fra i Task del progetto; le registrazioni concorrenti dei sotto-agenti sulla stessa Proposal sono serializzate e nessuna va persa.
- Il file di un Task della Proposal ha nel front matter solo `technical` e `refs`, poi titolo H1 e corpo; ogni altro campo è un errore.
- All'approvazione i Task nascono in To do, legati alla Proposal, tutti con l'istante dell'approvazione e ordinati per identità.
- Il design può scrivere Technical Task, che appartengono al design come gli altri.
- Portano Task soltanto le Proposal ordinarie non allegate a un Drift; import, risoluzioni e Proposal allegate non hanno Task né controllo di copertura.
- Ogni voce dello scope (`changed`, `removed, its container`, `leads into a change`) deve essere coperta: da un Task il cui riferimento è la voce o la contiene, oppure da una riga della sezione `## Already present` del corpo (``- `ref` — dove``). Le voci dei rimossi sono coperte dai Task di rimozione.
- Il controllo di copertura e dei riferimenti dei Task fa parte della validità: rifiuta la consegna e blocca l'approvazione quando non vale più.
- Per ogni elemento del Model rimosso il cui contenitore resta, l'approvazione crea un Task `Remove code of <ref>` che punta al contenitore vivo; Feature o Actor rimossi danno un Technical Task senza riferimenti. Le sezioni di Requisiti rimosse non creano Task.
- Lo scope si calcola dal vivo per Draft e Open e non si salva più all'approvazione; le Proposal approvate che lo hanno restano leggibili.
- Nel design l'agente principale divide lo scope per Machine; un sotto-agente per Machine scrive i Task dei propri riferimenti; le voci non di una Machine restano all'agente principale.
- Lo scan leggero prima della consegna legge il codice solo per le voci che l'esplorazione non ha visto; una contraddizione con il Model apre un nuovo round di domande, mai un Drift. Non si annuncia e non entra nella barriera dell'autopilota.
- Il pre-flight è il primo passo dello stesso agente del Run, prima del primo gruppo, in ogni Run: un Task, un design, Run all To do e il Run automatico dell'autopilota.
- Il pre-flight confronta solo i riferimenti esatti dei Task non bloccati che partono, deduplicati, senza Transition aggiunte e senza General; archivia solo Drift; con una sola Machine la confronta l'agente del Run senza sotto-agenti.
- Un Drift trovato dal pre-flight blocca i Task che riguardano lo stesso elemento e il Run continua sugli altri.
- Un pre-flight fallito o interrotto chiude il controllo con esito fallito, registrato come ogni scan fallito, e l'agente scrive una riga di avviso nel terminale o nella chat, ripetuta nel resoconto; il Run continua. Nessuna notifica nuova dell'editor.
- Titoli del controllo: `Pre-flight of <titolo della Proposal>`, `Pre-flight before Task <numero breve>`, `Pre-flight before all Tasks`, `Pre-flight before automatic fixes`.
- Nello scan di fine corsa le General nominate dai Task portati in Done entrano nell'ambito, confrontate solo nel codice che la corsa ha toccato.
- Si tolgono `trama.autoScan`, lo scan dopo l'approvazione, l'avviso di Cursor «Scan now» e la descrizione dello scan dopo l'approvazione nel README (e nel README dell'estensione). Gli scan manuali restano invariati; nessuna migrazione.
- Il developer rivede i Task in `trama proposal show`, nei dettagli della Proposal nel Diagramma (sezione `Tasks` con riferimenti e corpo dietro «Show details», poi i `Remove code of X` marcati `on approval`) e sulla scheda della Board (`Creates N Tasks`).

Assunzioni da verificare:
- Un `trama.autoScan` rimasto nelle impostazioni è ignorato e non riscritto, come fu per `trama.autoImplement`.
- I sotto-agenti del pre-flight usano `trama.scan`, come ogni sotto-agente che confronta una Machine; il Run resta su `trama.execution`.
- I riferimenti del pre-flight li calcola Trama con `trama task scope --pre-flight`, che sceglie i Task che partono come `trama task next` (stessi filtri `--proposal` e `--task`).
- Questa Proposal non porta file di Task: il flusso nuovo non esiste ancora, quindi i suoi Task arrivano dallo scan dopo l'approvazione di oggi.
