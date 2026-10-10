---
column: done
technical: false
refs:
  - agent-terminal
  - requirements/rules#agent-terminal
  - requirements/tech#agent-terminal
drift: 07l9m8zt
proposal: null
agent: false
created: 2026-10-10T18:26:06.305Z
finished: 2026-10-10T18:33:42.893Z
---
# Fix code to match the Model: Automatic Copilot scan fallback omits Scan now

## What happens

Quando una Proposal ordinaria approvata richiede la scansione automatica e la chat di Copilot non accetta il prompt, Trama copia soltanto l’istruzione negli appunti e mostra l’avviso generico di incollarla nella chat. Non offre **Scan now** per lanciare quella scansione successivamente. Lo stesso percorso vale negli editor diversi da Cursor. In Cursor, invece, l’invio automatico non riuscito produce già l’avviso relativo alla Proposal con il pulsante di scansione.

## What should happen

La scansione automatica deve partire soltanto se la chat invia da sola l’istruzione. Se la consegna ripiega sugli appunti, il developer deve ricevere un **avviso con un pulsante per lanciare la scansione quando vuole**, senza lasciare una conversazione in attesa. Il pulsante deve inviare la stessa scansione mirata alla Proposal approvata; chiudere l’avviso non avvia nulla. Questo comportamento della Machine non è limitato a Cursor.

## Chosen option

**Offer the approval scan after every unsent chat delivery**

Conservare il ripiego negli appunti e il suo avviso, ma offrire anche la scansione della Proposal quando qualunque chat non ha inviato da sola il prompt. Scan now usa la stessa istruzione della scansione automatica. È la soluzione raccomandata perché rende uniforme il recupero tra editor senza cambiare gli invii manuali; il costo è un secondo avviso nel caso degli appunti.

## Where in the code

extension/src/host/agent.ts: openChat, launchAgent; extension/src/host/controller.ts: approvalOptions; extension/src/host/cursor.ts: toClipboard, openCursorChat
