---
status: approved
requires:
  - u064bqz0
base:
  agent-launching/scan-hold.md: c6c04e87d8e460689295891bbbe24e7e5773e994c1efb2126e10759fd8756d8f
  system.md: 759f546af2156aa0b7387380c391c65b09e90202e896f09f592fc3d100011d84
  actors/developer.md: caab6a6ec24c70221dc7997f2d137e2eadc377698472219a5a688d0c2484f4a5
  agent-launching/agent-terminal.md: 3263eac2492ffe717777b09b8c2b4debf03ffaed85c22c673a4beb8161459945
  agent-launching/feature.md: bbc3f13a248d3648104db617dc0d479dc5ce4576268e0bd6681711cda70783f6
  model-changes/proposal.md: 4de3872fe9f7d8d085ab3576980605748b7742eed446b05b1dbaef60f81dc7fe
  editor-panel/panel.md: c7d708f5a19a3bc3dd56aff12a5c16f68aebe76a616acb5274df184f0efbd11b
  editor-panel/diagram.md: 8f87f40d772857c7c2aaa92fc7dc2ea033c4536f260575f9d8f05caa3f89357e
  work/announcement.md: d42191fbbf93d5a1191b61e2dda6876dceaec59d12b80ca85f3b0f4908efddba
  work/task.md: 79a2d50c3bdba6fb66f50dfc1dbd2b50e0b3ef6549ad88998f6504df46e38680
  project-setup/project.md: 158abb7eca015195fbcf2741751a865556c50c85bb4e9b6a1affe4adcd1c7fa4
  requirements/rules/scan-hold.md: 9fb90330211caf263ef8c25399ca66dbee89af2109717aa6660035b002eac673
  requirements/data/agents.md: ba7319a7232b01d12fd70c8e49b5f25f18af183f5399368562a3bd48be7e0db8
  requirements/data/general.md: 8d38531b95e0424d68cd9aceec39df8e65820b8092580a82e3be488ecc3d11da
  requirements/data/work.md: 970fb1313b0147abbeeefd3347aed846db9f3cf7f4c6a9c5a50f76060fc86cc4
  requirements/quality/main.md: 5a95d8cb53b575259038940e8a86d54e282fcad863d8f18409259befd5247d4a
  requirements/rules/agent-terminal.md: 76d769e25c31924c9f31614fef0574d762a47ea2ceb19ec43a1ff2eecdda6dcf
  requirements/rules/announcements.md: 6ca80efa0e7063fac56810fc9092e6e93621ed0775575e5e73c00fd4e446d122
  requirements/rules/decisions.md: d970c79a9825f33f9162764317348fdf239a92208b0e0d5ee989d71f13f5fae2
  requirements/rules/general.md: 7d7db119daa09321c2cc10d953ac02b83e5c02ddbe61f432c6088ba824d13367
  requirements/rules/models.md: b21ae4aa592753e76b7f8b69629390e187c3a2b90abae0290a82c33f0ee2607f
  requirements/rules/project.md: 124c1268891881fbfaa70ed5f58a88ff5668842590e463667fcc22454d9d9899
  requirements/rules/tasks.md: 1574804e3fd635d45cbf3d78e0c11af5cbf554c306882da20697a6698f02ab0c
  requirements/tech/agent-terminal.md: 686368884b88204efad8f87b40d8a71dc7ab634303f7f49226bac81be4121ef4
  requirements/tech/announcements.md: 190ba321ad2987b566806133898c9363ac9e61207272c6b4bb409fa7ecaa9b87
  requirements/tech/general.md: c2edc2896702ff4314d58a90ae1ad4a9012abe4efda550cd776ab1373e91e98b
  requirements/tech/models.md: 19f9f0ae036859339ab4a5c74cb3cf395dd238812c8d4716800426b59e4b3807
  requirements/tech/proposal.md: 8625f543d7f28ba2f064936b4bd3144ee8a74a65b7fc43490d7f7591fcb4a654
  requirements/tech/requests-scan-hold.md: 03112d5f9dd47022137a3caa778242423c0a5f08adab72ab687b0748fad2fc3f
  requirements/tech/work.md: 9b85ba7bb93595a874c54abcc8484f104abbaa9a1215891b477ec1b8d5c783c1
  requirements/ui/agents.md: ea5e619108277c144a2fd0d83cdfd7f73800043dae81b0c7969f2be87525fb59
  requirements/ui/panel.md: 39b572a6d86fc44c50e159c30f98e2fdd66ca653b010691b569683f3e615dc09
  requirements/ui/questions-notices.md: 7076a1c932c09cb7ea5726b45af8a59a0278d2b6549e98bfc3eea5dce4b48888
  requirements/ui/work.md: f5e784633f563d454165404cc6f18b684f63b0d5a884d5e64269cc0a20a06af6
  requirements/tech/requests.md: new
  requirements/ui/board.md: new
delete:
  - agent-launching/scan-hold.md
  - requirements/rules/scan-hold.md
  - requirements/tech/requests-scan-hold.md
created: 2026-10-10T12:22:23.885Z
scanScope:
  - ref: agent-launching
    reason: changed
  - ref: developer
    reason: removed, its container
  - ref: agent-terminal
    reason: changed
  - ref: panel/Open
    reason: changed
  - ref: proposal.APPROVED
    reason: changed
  - ref: project/Not a Trama project/developer.INITIALIZE_PROJECT
    reason: changed
  - ref: project/Trama project/developer.UPDATE_SKILLS
    reason: changed
  - ref: announcement
    reason: changed
  - ref: announcement/Verifying/agent.CHANGE_CHECK_PHASE
    reason: changed
  - ref: task
    reason: changed
  - ref: panel/Closed/developer.OPEN_PANEL
    reason: leads into a change
  - ref: panel/Closed/question-round.ROUND_OPENED
    reason: leads into a change
  - ref: project/Trama project/proposal.APPROVED
    reason: leads into a change
  - ref: drift/Open/proposal.APPROVED
    reason: leads into a change
  - ref: requirements/data#task
    reason: changed
  - ref: requirements/data#announcement
    reason: changed
  - ref: requirements/quality#agent-launching
    reason: changed
  - ref: requirements/quality#task
    reason: changed
  - ref: requirements/rules#agent-terminal
    reason: changed
  - ref: requirements/rules#announcement
    reason: changed
  - ref: requirements/rules#agent-launching
    reason: changed
  - ref: requirements/rules#work
    reason: changed
  - ref: requirements/rules#project
    reason: changed
  - ref: requirements/rules#task
    reason: changed
  - ref: requirements/tech#agent-terminal
    reason: changed
  - ref: requirements/tech#announcement
    reason: changed
  - ref: requirements/tech#General
    reason: changed
  - ref: requirements/tech#agent-launching
    reason: changed
  - ref: requirements/tech#proposal
    reason: changed
  - ref: requirements/tech#design-request
    reason: changed
  - ref: requirements/tech#task
    reason: changed
  - ref: requirements/ui#agent-terminal
    reason: changed
  - ref: requirements/ui#agent-launching
    reason: changed
  - ref: requirements/ui#panel
    reason: changed
  - ref: requirements/data
    reason: removed, its container
  - ref: requirements/rules
    reason: removed, its container
  - ref: requirements/tech
    reason: removed, its container
  - ref: requirements/ui
    reason: removed, its container
---
# No Hold scan, no Jev or triage, selective end-of-run scan, Scan counter

Seconda Proposal della richiesta di design «Rimozione feature di prova», scritta sopra la Proposal u064bqz0: via le scansioni di prova, resta il confronto diretto.

Decisioni prese nell'intervista:
- Hold scan sparisce del tutto: interruttore, sospeso, cartella locale, scansione allo spegnimento. Nessuna migrazione: le Proposal eventualmente in sospeso sono dimenticate.
- Via Jev, il classificatore System 1, `trama classify`, l'impostazione `trama.system1`, i comandi della chiave e il sotto-agente `trama-triage`: ogni Machine dell'ambito è confrontata direttamente da un sotto-agente. La chiave di Jev già salvata resta nell'archivio segreto, inutilizzata.
- I sotto-agenti che confrontano le Machine girano sul modello di scansione (`trama.scan`); il ruolo di analisi resta per design, import e Resolve Drifts, quello di esecuzione per i Task.
- `trama.maxParallelAgents` (predefinito 20, intero da 1 in su, un valore non valido vale 20) limita ogni ventaglio di sotto-agenti: la scansione, l'esplorazione del design e i gruppi di Task di una corsa. Trama lo scrive nell'istruzione; un agente senza sotto-agenti lo ignora.
- Lo scan globale di fine corsa sparisce. Al suo posto, alle condizioni di oggi (almeno un Task in Done, nessun Task della corsa bloccato, verifica finale passata), la corsa scansiona solo gli elementi a cui puntano i Task realizzati, con le Transition che vi entrano; un riferimento a una sezione dei Requisiti vale per l'elemento che la intitola; un Task che punta solo a `General` o a un'Area non aggiunge nulla. La velocità è la priorità.
- Lo scan di tutto il Sistema lo lancia solo il developer, da `Scan System` della Board o da `Scan` del Diagramma a livello Sistema. Quei pulsanti mostrano il numero di Task ora in Done arrivati lì dopo l'inizio dell'ultimo scan globale finito; alla consegna dello scan il numero è ricalcolato e torna a zero solo se nessun Task è finito durante lo scan; l'istante si ricorda per copia di lavoro, non versionato; senza ricordo il conteggio parte dal momento in cui Trama lo scrive la prima volta.

Scelte mie da verificare: il ricordo dell'ultimo scan globale sta in `.trama/last-scan/` con un `.gitignore` proprio, come era `scan-hold/`; il sotto-agente `trama-analysis` resta, con il modello di scansione, e `trama-triage` è rimosso da `.omp/agents/` da Update skills.
