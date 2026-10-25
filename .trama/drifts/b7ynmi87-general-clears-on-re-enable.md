---
status: resolved
resolution: fix-code
refs:
  - omp-chat-general/Kept after switch-off
proposal: null
task: 6fc59szq
origin: null
option: 1
note: null
resolvedBy: 0p3nvjyt
created: 2026-10-24T19:39:19.063Z
job: 1a64e0c6-6cc2-4d34-a782-2220c2d94f82
---
# General clears on re-enable

## What happens

When omp Chat is turned back on while General is kept with its agent still in a turn, the System stops that agent, drops its conversation and starts a new empty omp, without asking the developer.

## What should happen

General returns to its normal state as it was: its agent keeps its turn and its conversation, and the tab shows the eraser again. Nothing is stopped or cleared without the developer's order.

## Fix options

### Keep the running agent

When omp Chat comes back on, General goes straight to Ready with its running agent and its conversation, and the tab shows the eraser again. Nothing is stopped or cleared. The kept process then follows the normal rules of a Ready General: its exit, its stop and the window closing. This changes the transition from kept on a switch-on, and the host no longer restarts omp in that case.

### Resume after the turn

When omp Chat comes back on, General waits for its agent to finish the current turn, then ends that process and resumes its saved session in a new one, so the history stays and nothing is cleared. It costs a restart of the agent and a short wait before the conversation answers again, and it depends on the saved session being resumable.

## Where in the code

src/core/omp-chat-general.ts, the kept case of transition (line 119) and the ready case that enters kept (line 97); extension/src/host/omp-chat/general.ts, the effects stop, discard, cleared and start run on that transition.

## Prepared question

```json
{
  "question": {
    "id": "b7ynmi87",
    "question": "Quando omp Chat torna in uso mentre General è rimasta con l'agente in un turno, che cosa deve succedere?",
    "context": "Se omp Chat viene spenta mentre l'agente di General sta lavorando, General resta nella vista con il suo agente al lavoro. Quando omp Chat torna in uso, oggi General viene fermata, la sua conversazione scartata e parte un omp nuovo, senza che il developer lo abbia chiesto. Il Modello e i Requisiti descrivono questo comportamento (General torna normale, con la pulizia), ma la specifica del Drift dice che General deve tornare com'era, con l'agente e la conversazione conservati.",
    "options": [
      {
        "label": "Mantenere l'agente in esecuzione",
        "description": "Quando omp Chat torna in uso, General passa subito a pronta con il suo agente e la sua conversazione; nulla viene fermato o cancellato."
      },
      {
        "label": "Riprendere dopo il turno",
        "description": "Quando omp Chat torna in uso, General attende la fine del turno dell'agente, chiude quel processo e riprende la sessione salvata in un processo nuovo."
      },
      {
        "label": "Pulire e ripartire da capo",
        "description": "Quando omp Chat torna in uso, General ferma l'agente, scarta la conversazione e avvia un omp nuovo con una sessione vuota."
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
      "decision": "dismissed"
    }
  ],
  "fingerprint": "baabe75a17feed77d188d35a3dc96bdc79719fc854196a6011637250b38eb7ff",
  "prepared": "2026-10-24T19:49:58.164Z"
}
```
