---
status: resolved
resolution: unified
refs:
  - requirements/rules#focus
proposal: null
task: null
origin: null
unifiedInto: 2pdnq92f
option: null
note: null
created: 2026-10-27T07:09:53.957Z
job: e60ceeff-b80c-4f03-82bf-504764d7d43a
---
# Untitled sections counted missing

## What happens

Nella scheda Diagramma, un riferimento `requirements/<area>#<sezione>` la cui sezione non è intitolata a un elemento del Modello è contato fra i riferimenti non trovati, con il testo «N not found» nella barra del focus, e il conteggio dice «1 not found» anche se la sezione esiste nei Requisiti.

## What should happen

Un riferimento di questo tipo non è né un passo né un riferimento mancante nel Diagramma: la sezione esiste nei Requisiti e il Diagramma la ignora, come le sezioni General e le Aree intere. Il conteggio dei mancanti resta per gli elementi del Modello che non esistono e per le sezioni o le Aree che non esistono nei Requisiti.

## Fix options

### Skip them in the Diagram count

Il Diagramma non conta più questi riferimenti né come passi né come mancanti. Il conteggio «not found» della barra resta per gli elementi del Modello che non esistono e per le sezioni o le Aree che non esistono nei Requisiti disegnati. Costo: un riferimento a una sezione senza elemento non compare in nessun conteggio della barra del Diagramma, e la barra non lo segnala.

### Skip them, but name them in the tooltip

Il Diagramma non conta questi riferimenti fra i mancanti, come sopra, ma il tooltip del testo «not found» elenca anche quelli che il Diagramma ignora, con la sezione dei Requisiti a cui rimandano. Costo: il tooltip cresce con una seconda lista, e i riferimenti ignorati non producono alcun passo né alcun segnale nella barra.

## Where in the code

extension/src/webview/focus/diagram.ts: elementRef (lines 33-38) and diagramSteps, where a reference with no element is pushed to missing (lines 48-62)

## Prepared question

```json
{
  "question": {
    "id": "osfxi3oc",
    "question": "Come deve contare il Diagramma un riferimento a una sezione dei Requisiti che non è intitolata a un elemento del Modello?",
    "context": "Nella barra del focus della scheda Diagramma, un riferimento `requirements/<area>#<sezione>` la cui sezione non è intitolata a un elemento del Modello conta oggi fra i riferimenti mancanti, con «N not found», anche se la sezione esiste nei Requisiti. Il Requisito del focus non dice cosa fare di questi riferimenti: vale la regola per cui un riferimento non trovato è mancante. Le sezioni `General` e le Aree intere, invece, non vanno nel Diagramma e non contano.",
    "options": [
      {
        "label": "Ignorarli nel conteggio",
        "description": "Il Diagramma non li conta né come passi né come mancanti.",
        "details": "Il conteggio «not found» resta solo per gli elementi del Modello che non esistono e per le sezioni o le Aree che non esistono nei Requisiti. Costo: un riferimento a una sezione senza elemento non compare in nessun conteggio della barra, e la barra non lo segnala."
      },
      {
        "label": "Ignorarli e nominarli nel tooltip",
        "description": "Il Diagramma non li conta fra i mancanti, ma il tooltip li elenca con la sezione a cui rimandano.",
        "details": "Il conteggio «not found» è lo stesso dell'opzione precedente. Il tooltip mostra anche i riferimenti ignorati, così la sezione senza elemento resta visibile. Costo: il tooltip cresce di una seconda lista, e i riferimenti ignorati non producono alcun passo né alcun segnale nella barra."
      },
      {
        "label": "Contarli come mancanti",
        "description": "Un riferimento a una sezione senza elemento conta come mancante, come oggi.",
        "details": "Il Requisito del focus viene completato con questa regola, così il conteggio include anche le sezioni dei Requisiti che il Diagramma non mostra. Costo: il conteggio «1 not found» può sembrare un errore per una sezione che esiste nei Requisiti."
      }
    ],
    "recommended": 1,
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
  "fingerprint": "e3cbca4763867764160298395cdeae0a022086067e955f107da0aadba7cc5ded",
  "prepared": "2026-10-27T07:18:22.745Z"
}
```
