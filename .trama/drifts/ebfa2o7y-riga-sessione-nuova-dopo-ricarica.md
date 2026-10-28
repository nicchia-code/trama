---
status: resolved
resolution: unified
refs:
  - omp-chat-general/Waiting for the window
  - omp-chat-general/Starting
proposal: null
task: null
origin: null
unifiedInto: 2pdnq92f
option: null
note: null
created: 2026-10-27T07:10:02.306Z
job: e60ceeff-b80c-4f03-82bf-504764d7d43a
---
# Riga sessione nuova dopo ricarica

## What happens

Quando la finestra si ricarica e la sessione di General non si riapre, General riparte vuota, ma sotto la conversazione vuota compare la riga di testo secondario `New session: the agent does not remember the messages above.`

## What should happen

Dopo una ricarica con la sessione non riaperta, General riparte vuota senza la riga sulla sessione nuova. La riga compare solo quando un omp chiuso da solo non riapre la sessione e la storia di prima resta visibile sopra.

## Fix options

### Togliere la riga dopo la ricarica

Il ramo che riparte dopo la ricarica non segna più la sessione nuova: General riparte vuota, come descritto nel Model. La riga resta solo per il caso di un omp chiuso da solo, con la storia di prima sopra. Il codice cambia nel punto in cui la ripartenza è avviata dopo la ricarica. Il Model e i Requirements non cambiano.

### Mostrare la riga anche dopo la ricarica

Il comportamento attuale resta: la riga compare anche dopo la ricarica, sotto una conversazione vuota, per dire che la sessione è nuova. Il codice non cambia. La scheda vuota ha così un avviso in più rispetto a quanto descritto per General: il Model resta com'è, e la differenza si lascia così.

## Where in the code

extension/src/host/omp-chat/general.ts:343 (attach with fresh flag from mode startNew), extension/src/host/omp-chat/general.ts:351, extension/src/webview/omp-chat/conversation.tsx:90

## Prepared question

```json
{
  "question": {
    "id": "ebfa2o7y",
    "question": "Dopo una ricarica con la sessione di General non riaperta, la riga «New session» deve comparire sotto la conversazione vuota?",
    "context": "General tiene una sessione con omp. Quando la finestra si ricarica e la sessione non si riapre, General riparte vuota, ma sotto la conversazione compare la riga di testo secondario «New session: the agent does not remember the messages above.». Il Model dice che in quel caso General riparte vuota, senza avvisi; la riga è prevista solo quando un omp chiuso da solo non riapre la sessione e la storia di prima resta sopra. La Drift non ha predecessori e non viene da un merge.",
    "options": [
      {
        "label": "Togliere la riga dopo la ricarica",
        "description": "Il codice cambia; il Model e i Requisiti restano come sono.",
        "details": "Dopo la ricarica General riparte vuota, senza la riga. La riga resta solo per un omp chiuso da solo, con la storia di prima sopra. Consigliata: il Model e i Requisiti già dicono così; il prezzo è che dopo la ricarica non si vede più che la sessione è nuova."
      },
      {
        "label": "Mostrare la riga anche dopo la ricarica",
        "description": "Il codice non cambia; il Model e i Requisiti restano come sono.",
        "details": "La riga resta sotto la conversazione vuota anche dopo la ricarica. Il Model e i Requisiti continuano a dire che non compare, quindi la differenza resta."
      },
      {
        "label": "Dire nel Model che la riga compare dopo la ricarica",
        "description": "Una Proposal cambia il Model e i Requisiti; il codice non cambia.",
        "details": "Il Model e i Requisiti dicono che la riga compare anche dopo la ricarica con la sessione non riaperta, come fa il codice."
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
  "fingerprint": "dd0c32c2bfd6a641198ed3d9aa37395dfdb22af987e64cf941c5976c91ffa3c9",
  "prepared": "2026-10-27T07:19:05.889Z"
}
```
