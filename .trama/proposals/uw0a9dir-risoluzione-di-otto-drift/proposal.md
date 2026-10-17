---
status: approved
kind: resolution
drifts:
  - drift: ww05byl1
    decision: fix-code
    option: 1
  - drift: zt3lnqme
    decision: fix-code
    option: 1
  - drift: drs8x2wc
    decision: fix-code
    option: 1
  - drift: ese20q1h
    decision: fix-code
    option: 1
  - drift: p6m78egx
    decision: fix-code
    option: 1
  - drift: 9l9dofp1
    decision: fix-code
    option: 1
  - drift: kr05liot
    decision: fix-code
    option: 1
  - drift: 60vjq177
    decision: proposal
base:
  requirements/rules/project.md: bfb9f0917b511b10cf35d7d164f968d362ad5d8d5b32286fbd1c40b2c3c14cc7
delete: []
created: 2026-10-17T12:09:37.712Z
---
# Risoluzione di otto Drift

Risolve otto Drift secondo le risposte del developer:

- ww05byl1 – File di History illeggibili non sono segnalati come errori della Snapshot: correggere il codice, il file che non si legge compare tra gli errori del banner della Snapshot e la colonna mostra le altre voci.
- zt3lnqme – Resolve su un solo Drift non rende operativa la delega dopo l'apertura dell'editor: correggere il codice, anche Resolve su un solo Drift riattiva la delega come Resolve all.
- drs8x2wc – Le descrizioni di trama.execution e trama.analysis non dicono tutti i lavori che usano il modello: correggere il codice, le descrizioni nominano anche il Run automatico, il suo pre-flight e la preparazione della risoluzione automatica.
- ese20q1h – Riaprire l'editor non libera i Task che un agente morto aveva preso: correggere il codice, all'avvio i Task presi da agenti non più seguiti tornano in To do.
- 60vjq177 – Budget delle skill di Requisiti con la skill degli Specs: i Requisiti adottano il comportamento attuale, il budget conta anche la skill degli Specs quando esiste.
- p6m78egx – Testo vuoto della colonna History diverso dal Requisito: correggere il codice, la colonna dice Nothing done in this period.
- 9l9dofp1 – Badge Resolving con nome accessibile diverso dal Requisito: correggere il codice, il nome accessibile è uguale al tooltip.
- kr05liot – Scheda di attesa senza pallino di stato e nome accessibile diverso: correggere il codice, pallino di stato in testa e nome accessibile senza i due punti.
