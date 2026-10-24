---
created: 2026-10-22T05:54:58.140Z
updated: 2026-10-22T05:54:58.140Z
summary: Reject non chiede più feedback; Rework with feedback, dalla freccetta di Reject e Dismiss Drift, fa rifare all'agente una Proposal rifiutata o un Drift seguendo il testo del developer.
tasks:
  - bmlcl9tm
  - d84voh5b
  - dyefr1as
  - eiu0vmo1
  - h2zcfv7f
  - nkywqlq8
  - y3pvqqlk
cleared:
  y3pvqqlk:
    title: "Rework: casella e istruzioni"
    proposal: q51924cv
    tag: Rework with feedback
    finished: 2026-10-22T05:49:50.913Z
    refs:
      - developer.REJECT_PROPOSAL
      - developer.REWORK_PROPOSAL
      - requirements/ui#developer.REWORK_PROPOSAL
      - requirements/tech#developer.REWORK_PROPOSAL
      - requirements/cli#General
  h2zcfv7f:
    title: Rifiuto senza e con feedback
    proposal: q51924cv
    tag: Rework with feedback
    finished: 2026-10-22T05:48:19.507Z
    refs:
      - proposal/Open/developer.REJECT_PROPOSAL
      - proposal/Open/developer.REWORK_PROPOSAL
      - proposal/Rejected
      - proposal/Open/drift.CODE_FIX_CHOSEN
      - proposal/Open/drift.RESOLVED_BY_PROPOSAL
  bmlcl9tm:
    title: Rework entra in Resolving
    proposal: q51924cv
    tag: Rework with feedback
    finished: 2026-10-22T05:47:28.435Z
    refs:
      - drift-resolution
      - drift-resolution/Free/developer.REWORK_DRIFT
      - drift-resolution/Free/developer.REWORK_PROPOSAL
      - drift-resolution/Running tasks
      - drift-resolution/Resolving
      - drift-resolution/Free/developer.ASK_AGENT
      - drift-resolution/Answering a prepared question/question-round.ROUND_CLOSED
  eiu0vmo1:
    title: Legame reworks delle Proposal
    proposal: q51924cv
    tag: Rework with feedback
    finished: 2026-10-22T05:47:20.480Z
    refs:
      - proposal
      - requirements/data#proposal
  dyefr1as:
    title: Freccetta Rework nel pannello
    proposal: q51924cv
    tag: Rework with feedback
    finished: 2026-10-22T05:46:58.675Z
    refs:
      - panel/Board
      - panel/Open/developer.SHOW_BOARD
      - requirements/ui#panel
      - drift
      - drift/Open/developer.FIX_DRIFT_CODE
  nkywqlq8:
    title: Skill che rifanno
    proposal: q51924cv
    tag: Rework with feedback
    finished: 2026-10-22T05:46:27.822Z
    refs:
      - requirements/rules#developer.REWORK_PROPOSAL
  d84voh5b:
    title: Rework di un Drift
    proposal: q51924cv
    tag: Rework with feedback
    finished: 2026-10-22T05:46:23.022Z
    refs:
      - developer.REWORK_DRIFT
      - developer.FIX_DRIFT_CODE
      - requirements/ui#developer.REWORK_DRIFT
      - requirements/tech#developer.REWORK_DRIFT
      - requirements/rules#developer.REWORK_DRIFT
---
# Rework with feedback

Reject rifiuta subito, senza casella di feedback. Reject e Dismiss Drift diventano pulsanti divisi con la voce Rework with feedback nella Board e nei dettagli del Diagramma. Una Proposal rifiutata con feedback viene rifatta da un agente e la prima Proposal che apre ne prende il posto con il campo reworks; un Drift ancora aperto viene risolto dal solo agente seguendo il testo del developer, senza chiuderlo. Il lavoro entra nel tracciamento dei Resolving e le skill sanno rifare le Proposal rifiutate.
