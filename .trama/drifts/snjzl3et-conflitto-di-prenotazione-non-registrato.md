---
status: resolved
resolution: dismissed
refs:
  - prenotazione-file
proposal: null
task: q31mg7fb
origin: gi7sxia1
option: 1
note: null
resolvedBy: j8y4o2he
created: 2026-10-24T08:32:18.182Z
job: 9079c532-bbd9-4d9e-af10-d957e45548a2
---
# Conflitto di prenotazione non registrato

## What happens

Un sotto-agente di una Run fermato da una prenotazione non registra alcun conflitto con `trama timing new`, nemmeno con Parallel Execution attivo: l'hook non conosce il Task del sotto-agente, il Task che tiene il file né l'impostazione.

## What should happen

Con Parallel Execution il sotto-agente fermato da una prenotazione registra il conflitto con `trama timing new` (`kind: conflict`), come per ogni conflitto.

## Fix options

### Registrare dall'hook

L'host passa per variabile d'ambiente il Task del terminale e l'impostazione Parallel Execution; la prenotazione salva il Task del titolare; l'hook esegue `trama timing new` al blocco.

### Registrare dall'host a fine sotto-agente

Il blocco salva il conflitto nello store delle prenotazioni; l'host lo legge quando il sotto-agente termina e lo registra con `trama timing new`.

## Where in the code

extension/src/omp/trama-hook.ts (blocco in tool_call); src/core/claims.ts (claimWrites)

## Prepared question

```json
{
  "question": {
    "id": "snjzl3et",
    "question": "Quando una prenotazione ferma un sotto-agente con Parallel Execution attivo, come deve essere registrato il conflitto?",
    "context": "I Requisiti (rules#prenotazione-file) dicono che un sotto-agente fermato da una prenotazione registra il conflitto con trama timing new (kind: conflict) con Parallel Execution attivo, come per ogni conflitto. Il Modello (prenotazione-file) non lo descrive. Oggi il blocco di Trama ferma la scrittura ma non registra nulla: l'hook non conosce il Task del sotto-agente, il Task che tiene il file né l'impostazione Parallel Execution, e la prenotazione non salva il Task del titolare. Il Drift non ha predecessori. Scegliere l'ultima opzione cambia i Requisiti come nella Proposal allegata.",
    "options": [
      {
        "label": "Registrare dall'hook",
        "description": "L'host passa all'hook, per variabile d'ambiente, il Task del terminale e l'impostazione Parallel Execution; la prenotazione salva il Task del titolare e l'hook esegue trama timing new al blocco.",
        "details": "Il conflitto si registra nel momento del blocco, senza attendere la fine del sotto-agente."
      },
      {
        "label": "Registrare dall'host a fine sotto-agente",
        "description": "Il blocco salva il conflitto nello store delle prenotazioni; l'host lo legge quando il sotto-agente termina e lo registra con trama timing new.",
        "details": "La registrazione avviene solo se il sotto-agente termina normalmente e l'host lo legge prima che la prenotazione venga cancellata."
      },
      {
        "label": "Chiudere con la Proposal allegata",
        "description": "I Requisiti cambiano come nella Proposal allegata; nessuna modifica al codice.",
        "details": "Il conflitto di prenotazione non è più richiesto dai Requisiti: la Proposal allegata toglie la frase che chiede di registrarlo con trama timing new."
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
  "fingerprint": "6564864b445dfa7d96c20207f9a9b08c72c8bf42b516312d78477009aa2b05c0",
  "prepared": "2026-10-24T08:42:32.935Z"
}
```
