---
status: approved
kind: resolution
drifts:
  - drift: 5ednksns
    decision: fix-code
    option: 1
  - drift: g8hejv2d
    decision: fix-code
    option: 1
  - drift: wuphqg45
    decision: fix-code
    option: 1
  - drift: f5clkr4u
    decision: fix-code
    option: 1
  - drift: qbxdo5c9
    decision: fix-code
    option: 1
  - drift: bqqdz4cs
    decision: fix-code
    option: 1
base:
  requirements/rules/project.md: 731e47fa2b1554f327a193739da132549e90868b95d4601969e6d201574fad35
delete: []
created: 2026-10-10T10:32:45.833Z
---
# Resolve open Drifts on requests, questions, quiet period, identity rewrite and external windows

Risolve sei Drift aperti, tutti correggendo il codice:

- D1 – Consumed request: chosen option keeps IDs the Requirement drops: si corregge il codice (opzione 1). Una richiesta finita si riconosce dal file che non esiste più; gli ID senza file escono dall'elenco delle richieste inviate e il Task che li tratteneva si chiude senza cambiare il codice.
- D2 – Digit key clears the selected single-choice option instead of selecting it: si corregge il codice (opzione 1). Nella scelta singola il tasto numerico seleziona soltanto; deselezionare resta solo col clic.
- D3 – Quiet period of an idle hooked terminal keeps releasing Tasks taken later: si corregge il codice (opzione 1). La quiete di un terminale con hook trascorre una volta per periodo di silenzio e rilascia solo i Task presi in quel momento.
- D4 – Identity rewrite leaves numbered Drifts in a resolution's Drift list: si corregge il codice (opzione 1). La riscrittura delle identità aggiorna anche l'elenco dei Drift delle risoluzioni e la risoluzione che ha risolto un Drift; il Requisito sulla riscrittura nomina questi campi.
- D5 – Reused external window runs the agent outside the project folder: si corregge il codice (opzione 1). Ogni corsa in una finestra esterna, nuova o riusata, entra prima nella cartella del progetto.
- D6 – A WezTerm window opened while WezTerm was not running is never reused: si corregge il codice (opzione 1). Dopo aver avviato WezTerm da zero, Trama recupera il riquadro della finestra nuova e la ricorda per il riuso.
