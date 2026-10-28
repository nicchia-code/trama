---
status: resolved
resolution: unified
refs:
  - raffinamento/Fermo
  - requirements/rules#raffinamento
  - requirements/ui#raffinamento
proposal: null
task: null
origin: null
unifiedInto: 2pdnq92f
option: null
note: null
created: 2026-10-27T07:09:28.409Z
job: e60ceeff-b80c-4f03-82bf-504764d7d43a
---
# Refining notices miss the Board

## What happens

Quando un raffinamento non parte, o una Proposal raffinata non si approva, Trama mostra l'avviso come notifica dell'editor. La Board non dice perché la Proposal resta da raffinare.

## What should happen

Gli avvisi di un raffinamento, come «non è partito» e «raffinata ma non approvata», stanno in cima alla Board con il pulsante di chiusura degli altri avvisi, e la Board dice perché la Proposal resta da raffinare.

## Fix options

### Show the refining notices on the Board

Send the refinement notices to the Board's notice banner, as the other Board notices, and drop the editor message for them. Costs a single notice path for refinement; the Model and Requirements stay as they are.

### Keep the editor message and add a Board line

Keep the editor message and also show the reason as a line on the Proposal's card in the Board. Costs a repeated message and one more line on the card, but the editor message is still there for anyone not looking at the Board.

## Where in the code

extension/src/host/controller.ts: startRefinement (refining did not start warning), settleRefined (was refined but not approved warnings)

## Prepared question

```json
{
  "question": {
    "id": "tglmmrfi",
    "question": "Dove devono comparire gli avvisi di un raffinamento che non parte o non si approva?",
    "context": "Quando un raffinamento non parte, o una Proposal raffinata non si approva, Trama mostra l'avviso solo come notifica dell'editor. La Board non dice perché la Proposal resta da raffinare. Il Modello e i Requisiti di adesso dicono che gli avvisi di raffinamento stanno in cima alla Board, con il pulsante di chiusura degli altri avvisi.",
    "options": [
      {
        "label": "Mostrare gli avvisi sulla Board",
        "description": "Gli avvisi di raffinamento vanno nel banner della Board, come gli altri avvisi della Board.",
        "details": "Una sola via per l'avviso di raffinamento. Il Modello e i Requisiti restano come sono."
      },
      {
        "label": "Avviso nell'editor e riga sulla Board",
        "description": "Restano la notifica dell'editor e una riga sulla scheda della Proposal che dice il motivo.",
        "details": "L'avviso dell'editor resta anche per chi non guarda la Board, ma il messaggio è ripetuto e la scheda ha una riga in più."
      },
      {
        "label": "Solo avviso dell'editor",
        "description": "Gli avvisi restano notifiche dell'editor e la Board non li mostra.",
        "details": "Il comportamento del codice resta. Il Modello e i Requisiti che dicono il contrario cambiano, come nella Proposal preparata."
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
  "fingerprint": "faf3b613405a67217ed97c62ea0b15899af19d1063797852ffda529f44ee565a",
  "prepared": "2026-10-27T07:17:44.664Z"
}
```
