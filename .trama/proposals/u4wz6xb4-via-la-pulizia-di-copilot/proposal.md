---
status: discarded
base: {}
delete: []
created: 2026-10-27T07:17:34.073Z
---
# Via la pulizia di Copilot

# Via la pulizia di Copilot

Il codice non ripulisce più le tracce di Copilot: l'estensione non legge e non scrive nessun file di Copilot o di Cursor (`requirements/tech#project`). La regola del progetto va allineata a questo, così il Drift 7uge71w4 si chiude senza contraddizioni.

## Requirements

- `requirements/rules#project` (file `requirements/rules/project.md`), sezione `project`:
  - nel passo di Update skills, togliere la frase «Fatto dall'editor toglie i pezzi della chat di Copilot che le versioni precedenti installavano (`tech#project`); il resoconto nomina ciò che ha tolto e tace quando non c'era nulla. Dalla riga di comando non tocca i pezzi di Copilot.»;
  - nel passo del controllo all'apertura, togliere «e la rimozione dei pezzi della chat di Copilot» dall'elenco dei file e la frase «Togliere un pezzo di Copilot conta come aggiornamento.».

Nessun'altra regola cambia. Il controllo all'apertura e Update skills non toccano più i file di Copilot; le tracce già presenti nel progetto restano e si tolgono a mano.

## Model

Nessuna modifica al Model.
