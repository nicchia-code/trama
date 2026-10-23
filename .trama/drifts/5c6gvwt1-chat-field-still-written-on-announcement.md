---
status: resolved
resolution: dismissed
refs:
  - requirements/data#announcement
  - requirements/rules#announcement
proposal: null
task: bdiavd3z
origin: null
option: 1
note: null
resolvedBy: 0p88ftuf
created: 2026-10-23T14:21:46.030Z
job: 1d479b34-a693-4168-9deb-cb588b52311b
---
# Chat field still written on announcements

## What happens

Announcements still carry a `chat` field: originFromEnv returns `chat: editor` for agents outside a terminal, and the write path stores `chat` (editor by default, or the given chat) on every announcement that has no terminal.

## What should happen

An announcement has no `chat` or `conversation` field; an agent announcement always belongs to its terminal, and a file that still has `chat` or `conversation` is a read error, not converted.

## Fix options

### Drop the chat field

Remove `chat` from the announcement type, the parser and the writer; refuse announcements without TRAMA_TERMINAL; treat a file that still has `chat` or `conversation` as an invalid announcement.

### Keep chat internal only

Keep `chat` in memory for the editor only and never write it to the file; still fails the Requirement that a file with `chat` is a read error.

## Where in the code

src/core/announcements.ts

## Prepared question

```json
{
  "question": {
    "id": "5c6gvwt1",
    "question": "Un annuncio fatto fuori da un terminale di Trama deve portare un campo `chat`?",
    "context": "Il Requisito dei dati degli annunci dice che un annuncio non ha campi `chat` né `conversation`: appartiene sempre al terminale dell'agente, e un file che ha ancora `chat` è un errore di lettura. Oggi il comando `trama announcement new` lanciato da un agente senza terminale di Trama scrive `chat: editor` sull'annuncio e lo accetta, e il campo resta nel tipo, nella lettura e nella scrittura degli annunci.\n\nIl campo era di Cursor, che non è più supportato. Il Drift blocca i Task *Agente unico omp*, *Annunci solo da terminale* e *Ritiro annunci senza chat*.",
    "options": [
      {
        "label": "Togliere il campo chat",
        "description": "Annunci solo da terminale: senza terminale nessun annuncio, e un file con `chat` è illeggibile.",
        "details": "Il codice cambia: il tipo, la lettura e la scrittura perdono `chat`, `trama announcement new` rifiuta chi non ha `TRAMA_TERMINAL`, un file con `chat` o `conversation` è un errore di lettura. Costo: un agente che Trama non ha avviato non può più annunciare le sue schede."
      },
      {
        "label": "Tenere chat solo in memoria",
        "description": "Il campo resta per l'editor, ma non si scrive mai nel file.",
        "details": "Il codice cambia meno: `chat` vive solo in memoria e non finisce nel file. Costo: il Requisito dice che un file con `chat` è un errore di lettura, quindi la regola sui file resta vera ma l'annuncio senza terminale continua a esistere."
      },
      {
        "label": "Adeguare il Requisito al codice",
        "description": "Gli annunci senza terminale restano e portano `chat: editor`; cambiano i Requisiti, non il codice.",
        "details": "Il codice non cambia. La Proposal allegata riscrive il Requisito dei dati e la regola sul comando `trama announcement new`: un annuncio senza terminale è accettato, porta `chat: editor` e lo ritira l'avvio dell'editor. Costo: resta in vita il caso senza terminale che il resto del lavoro vuole togliere."
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
  "fingerprint": "166a5b9378144a131891b1dad71de2e3b0d32eeb5c427bb62463b56a16980ed0",
  "prepared": "2026-10-23T14:36:17.607Z"
}
```
