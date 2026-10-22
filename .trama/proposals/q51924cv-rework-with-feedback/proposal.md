---
status: approved
base:
  actors/developer.md: ef973183134d74251340f87d754f7f3152d6a7bec8ad67fc11659f92460c9fd8
  model-changes/proposal.md: 39ef1b59eee15bc7ee7d238e49bdbee415cba5295fd244256b8b25838fd3dea6
  agent-launching/drift-resolution.md: f44bf829a5a3d8977868596e36b88f79096232a715d6d39ef78d7b0f83ec7fc5
  editor-panel/panel.md: 70687ffc2f8b92a8443af3a940025050cdcdd43a239ed3a85bd4feef2a3bf0ce
  work/drift.md: 3383cebd0480cd5a601b90c508a484e8d47618af8701807d0ee59f18e7d1fd1d
  requirements/ui/rework.md: new
  requirements/rules/rework.md: new
  requirements/tech/rework.md: new
  requirements/data/proposals.md: 904f480140662c7c0cd76687900b50a0c8366139af8b52df390551f928a857a0
  requirements/ui/panel.md: 4c703364ad1b5da27147982d7bac202fe6814b36baabc57481b074413b8e901e
  requirements/cli/main.md: eac01a7626f5acfddcfc8202482254eb02bd9973668bde1ed26b8fed3b8daa0c
delete: []
request: 2026-10-22T07-01-59
created: 2026-10-22T05:27:11.759Z
label: Rework with feedback
---
# Rework with feedback

Reject e Dismiss Drift diventano pulsanti divisi: la freccetta in basso apre un menu con `Rework with feedback…`, che chiede un testo nella casella di input dell'editor e fa rifare il lavoro all'agente con quel feedback. Sostituisce il feedback facoltativo di Reject.

## Decisioni

- Rework su una Proposal: Trama la rifiuta con il feedback come `## Feedback` e chiede all'agente di scriverne una nuova; la vecchia resta rifiutata.
- Freccetta su Reject (Board, schede gialle comprese, e dettagli del Diagramma) e su Dismiss Drift (scheda rossa e dettagli del Diagramma).
- Reject semplice non chiede più nessun feedback.
- Etichetta della voce: `Rework with feedback…`.
- Casella confermata vuota: rielabora senza feedback, dopo una modale di conferma; con un testo parte subito. Esc annulla senza fare nulla.
- L'agente che rielabora può fare domande, ma non è obbligato: chiede solo le decisioni che il feedback lascia aperte. La skill lo sa.
- Rework su un Drift: Resolve di quel solo Drift con il feedback come indicazione; il Drift resta aperto finché il developer decide la risoluzione.
- Ogni tipo di Proposal è rifatto dalla skill che l'ha scritta: ordinaria → design; setup → setup se il Modello è ancora vuoto, altrimenti design; import → import; risoluzione → risoluzione dei Drift sui suoi Drift ancora aperti.
- La Proposal nuova eredita il posto della rifiutata in Backlog (stesso istante di creazione).
- Le Proposal che richiedevano la rifiutata, appena nasce la nuova, la richiedono al suo posto (possono poi diventare obsolete o invalide).

## Assunzioni da controllare

- Trama rifiuta la Proposal prima di mandare l'istruzione: se l'istruzione non parte davvero (resta pronta nella chat o negli appunti) la Proposal resta rifiutata con il suo feedback e l'istruzione, incollata a mano, funziona lo stesso.
- Il legame fra la Proposal nuova e quella rifatta è un campo `reworks` della nuova, come `request`: solo la prima Proposal della rielaborazione lo ha; una Proposal rifiutata è rifatta al più una volta.
- `trama proposal move <id> rejected` da riga di comando accetta ancora un `feedback` facoltativo: è il comando che Rework usa per salvare il testo.
- La freccetta è indisponibile quando lo è il pulsante principale, con lo stesso motivo; su una risoluzione e su un Drift anche quando Resolve lo sarebbe (Run in corso, altra risoluzione da decidere).
- Il feedback di un Drift viaggia nell'istruzione, perché un Drift non ha una sezione Feedback.
