---
status: resolved
resolution: unified
refs:
  - issue/Publishing/agent.RECORD_ISSUE_PUBLISHED
  - issue/Not published/developer.PUBLISH_AGAIN
proposal: null
task: null
origin: null
unifiedInto: 2pdnq92f
option: null
note: null
created: 2026-10-27T07:12:15.725Z
job: e60ceeff-b80c-4f03-82bf-504764d7d43a
---
# Issue moved outside Publishing

## What happens

Il comando con cui l'agente registra la pubblicazione di un issue accetta di spostarlo a Published, o a Not published con un motivo, anche quando l'issue non è in Publishing: un issue Not published può così passare a Published senza un nuovo tentativo di pubblicazione, cosa che il Model non prevede.

## What should happen

Trama registra l'esito della pubblicazione solo per un issue in Publishing, tenuto dall'agente che lo sta pubblicando. Un issue Not published torna in pubblicazione solo con Publish again, e l'agente non può portarlo a Published da fuori di Publishing.

## Fix options

### Refuse outcomes outside Publishing

Il comando di registrazione rifiuta ogni esito, Published e Not published, quando l'issue non è in Publishing, e lo dice con un messaggio che indica di usare Publish again. Le registrazioni fatte dall'agente durante una pubblicazione restano invariate, e il Model resta quello che è. Il costo è che un agente che ha perso la pubblicazione deve passare da Publish again, un percorso più lungo ma già previsto.

### Refuse Published outside Publishing only

Il comando rifiuta solo il passaggio a Published quando l'issue non è in Publishing, e lascia ai casi Not published la registrazione del motivo. Così il percorso di successo resta chiuso fuori da Publishing, ma un issue Not published può ancora ricevere un nuovo motivo senza passare da Publish again, cosa che il Model non prevede. Il costo è una regola più sottile da spiegare nel messaggio di errore.

## Where in the code

src/core/issues.ts moveIssue; src/cli/commands/issue.ts move

## Prepared question

```json
{
  "question": {
    "id": "tp41lv93",
    "question": "Un issue che non è in Publishing può ricevere l'esito della pubblicazione registrato dall'agente?",
    "context": "Il Model dell'issue prevede che l'esito della pubblicazione sia registrato solo mentre l'issue è in **Publishing**, e che un issue **Not published** torni in pubblicazione solo con **Publish again**. Il codice accetta invece la registrazione dell'esito anche fuori da Publishing: un issue Not published può così passare a Published senza un nuovo tentativo di pubblicazione. Può succedere quando l'agente creava l'issue su GitHub ma Trama lo aveva già segnato Not published perché l'agente si era fermato prima di registrarlo.",
    "options": [
      {
        "label": "Rifiuta ogni esito fuori da Publishing",
        "description": "Published e Not published sono rifiutati quando l'issue non è in Publishing, con il rinvio a Publish again.",
        "details": "Il Model resta quello che è. Un agente che ha perso la pubblicazione deve passare da Publish again, un percorso più lungo ma già previsto."
      },
      {
        "label": "Rifiuta Published fuori da Publishing",
        "description": "Solo il passaggio a Published è rifiutato fuori da Publishing; il motivo di Not published si può ancora registrare.",
        "details": "Il percorso di successo resta chiuso fuori da Publishing. Un issue Not published può ricevere un nuovo motivo senza Publish again, cosa che il Model non prevede. La regola è più sottile da spiegare nel messaggio di errore."
      },
      {
        "label": "Accetta l'esito fuori da Publishing",
        "description": "La registrazione di Published o di un nuovo motivo è accettata anche fuori da Publishing, come fa il codice oggi.",
        "details": "Il Model deve dirlo: la Proposal «Esiti fuori da Publishing» aggiunge al Model le due registrazioni dell'agente da Not published. Un issue creato su GitHub non si perde così se l'agente registra dopo essersi fermato."
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
  "fingerprint": "0acbab365955e4a19e3c64dab99e9e34a202e8158139d270801ef58b56e47217",
  "prepared": "2026-10-27T07:18:15.483Z"
}
```
