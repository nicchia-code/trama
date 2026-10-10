---
status: approved
kind: resolution
drifts:
  - drift: 4hoqqmhq
    decision: proposal
  - drift: 8hja6jhz
    decision: proposal
  - drift: c7zw58ep
    decision: proposal
  - drift: v7uefxa2
    decision: proposal
  - drift: s42chbwr
    decision: proposal
  - drift: f5ya69vo
    decision: proposal
base:
  actors/developer.md: 4a77b8a6cfea1db80d4711759c244a396f73895f6d5ce1245166e67b5081466f
  editor-panel/panel.md: 824eda35da50cf0a7386848babffcaffb478b8f7f39ec2df9f6742cb984024fa
  requirements/ui/work.md: 2fbd5ee79e4534b24be202128085f44889c9cced509e19dab0788835f189a674
  requirements/rules/project.md: 137a2318b61d3beb2faed5a94d0e6e1b6f3a15fd531de48005b4f11268883b79
  requirements/rules/announcements.md: a31c2990517d29f3da3a419d1e73760c981ad520dae06eb934d12dddb64ff6dc
delete: []
created: 2026-10-09T09:08:04.507Z
---
# Align Model and Requirements with the code for the six open Drifts

Risolve insieme i sei Drift aperti adeguando Modello e Requisiti a ciò che il codice fa già; nessun lavoro sul codice.

- 4hoqqmhq – Selecting a Drift no longer draws its attached Proposal: la descrizione di developer.CHOOSE_DRAWN_PROPOSAL non nomina più la selezione di un Drift; l'Evento nasce solo dal selettore e dai link a una Proposal disegnata.
- 8hja6jhz – Drift details in the Diagram show a Points at list: ui#drift ammette nei dettagli del Diagramma, dopo i due lati, l'elenco Points at con il link all'elemento o la nota che non si risolve più.
- c7zw58ep – The Board's Drift card lists its references: ui#drift e la descrizione della Board ammettono, fra titolo e due lati, la riga dei riferimenti, ognuno collegato al Diagramma o al Requisito.
- v7uefxa2 – Resolves Drifts rows show the note's text: ui#proposal dice che la riga finisce con · e il testo della nota.
- s42chbwr – Init installs trama-resolve-drifts: rules#project elenca anche trama-resolve-drifts fra le skill installate.
- f5ya69vo – Held scan check title: rules#announcement elenca il titolo Scan of held Proposals per la scansione delle Proposal in sospeso, un solo controllo per tutta la scansione.
