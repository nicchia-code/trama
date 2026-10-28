---
status: resolved
resolution: unified
refs:
  - requirements/tech#voce-history
proposal: null
task: null
origin: null
unifiedInto: 2pdnq92f
option: null
note: null
created: 2026-10-27T07:11:04.102Z
job: e60ceeff-b80c-4f03-82bf-504764d7d43a
---
# Dettaglio voce senza dialog nativo

## What happens

Il dettaglio di una voce di History è una finestra costruita con la libreria dei dialog del pannello, non un elemento dialog nativo aperto come modale.

## What should happen

Il dettaglio di una voce di History è un elemento dialog nativo del webview, aperto come modale, con focus, Esc e chiusura cliccando fuori come il Requirement descrive.

## Fix options

### Usare il dialog nativo

Il dettaglio della voce diventa un elemento dialog del webview aperto con showModal, come il Requirement chiede. Il browser dà il ruolo modale, il focus trattenuto nella finestra e la chiusura con Esc; la chiusura cliccando fuori va scritta a mano. Titolo, corpo, Tasks e chip restano uguali. Costa riscrivere il componente e i suoi test sul focus. Consigliata perché chiude la differenza col Requirement.

### Avvolgere la finestra nativa

Il contenuto resta quello di adesso, ma dentro un elemento dialog nativo aperto con showModal che lo ospita. Il Requirement è soddisfatto nella forma e l'aspetto cambia poco. Costa un livello in più di componenti da mantenere e un controllo del focus alla chiusura da verificare.

## Where in the code

extension/src/webview/board/history.tsx:82-146; extension/src/webview/ui/dialog.tsx:1-48

## Prepared question

```json
{
  "question": {
    "id": "gmhjdvmz",
    "question": "Come deve essere costruita la modale dei dettagli di una voce di History?",
    "context": "Il Requirement `tech#voce-history` chiede un elemento `<dialog>` del webview aperto con `showModal()`. Il dettaglio di una voce usa invece il `Dialog` del pannello, costruito con la libreria dei dialog già nel webview. Entrambe le strade danno ruolo modale, focus dentro la finestra ed Esc; la chiusura cliccando fuori va verificata in ciascuna.",
    "options": [
      {
        "label": "Usare il dialog nativo",
        "description": "Il dettaglio diventa un `<dialog>` del webview aperto con `showModal()`, come il Requirement chiede.",
        "details": "Titolo, corpo, Tasks e chip restano uguali. Il ruolo modale, il focus ed Esc vengono dal browser; la chiusura cliccando fuori va scritta a mano. Costa riscrivere il componente e i suoi test sul focus."
      },
      {
        "label": "Avvolgere la finestra nativa",
        "description": "Il contenuto resta quello attuale, dentro un `<dialog>` nativo aperto con `showModal()`.",
        "details": "Il Requirement è rispettato nella forma e l'aspetto cambia poco. Costa un livello in più di componenti da mantenere e un controllo del focus alla chiusura da verificare."
      },
      {
        "label": "Tenere il dialog del pannello",
        "description": "La modale resta il `Dialog` del pannello, e il Requirement cambia per ammetterlo.",
        "details": "Ruolo modale, focus, Esc e chiusura cliccando fuori esistono già. Costa una modifica al Requirement `tech#voce-history` (Proposal allegata) e lascia la regola del `<dialog>` nativo in un solo punto da rivedere."
      }
    ],
    "recommended": 0,
    "multi": false
  },
  "decisions": [
    {
      "decision": "fix-code",
      "option": 1
    },
    {
      "decision": "fix-code",
      "option": 2
    },
    {
      "decision": "proposal"
    }
  ],
  "fingerprint": "55ac1920e837fddf94322609148b71a044ce302067c8245ed1b7553b527a4faf",
  "prepared": "2026-10-27T07:17:49.921Z"
}
```
