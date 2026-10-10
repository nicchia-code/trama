---
status: resolved
resolution: fix-code
refs:
  - agent-terminal
  - requirements/rules#agent-terminal
  - requirements/tech#agent-terminal
proposal: null
task: t55eoa6q
origin: null
option: 1
note: null
resolvedBy: j39v4dxg
created: 2026-10-10T17:58:35.705Z
---
# Automatic Copilot scan fallback omits Scan now

## What happens

Quando una Proposal ordinaria approvata richiede la scansione automatica e la chat di Copilot non accetta il prompt, Trama copia soltanto l’istruzione negli appunti e mostra l’avviso generico di incollarla nella chat. Non offre **Scan now** per lanciare quella scansione successivamente. Lo stesso percorso vale negli editor diversi da Cursor. In Cursor, invece, l’invio automatico non riuscito produce già l’avviso relativo alla Proposal con il pulsante di scansione.

## What should happen

La scansione automatica deve partire soltanto se la chat invia da sola l’istruzione. Se la consegna ripiega sugli appunti, il developer deve ricevere un **avviso con un pulsante per lanciare la scansione quando vuole**, senza lasciare una conversazione in attesa. Il pulsante deve inviare la stessa scansione mirata alla Proposal approvata; chiudere l’avviso non avvia nulla. Questo comportamento della Machine non è limitato a Cursor.

## Fix options

### Offer the approval scan after every unsent chat delivery

Conservare il ripiego negli appunti e il suo avviso, ma offrire anche la scansione della Proposal quando qualunque chat non ha inviato da sola il prompt. Scan now usa la stessa istruzione della scansione automatica. È la soluzione raccomandata perché rende uniforme il recupero tra editor senza cambiare gli invii manuali; il costo è un secondo avviso nel caso degli appunti.

### Add the scan action to the automatic clipboard notice

Quando il prompt automatico finisce negli appunti, offrire Scan now direttamente nello stesso avviso che informa della copia. Il developer può incollare il testo oppure rilanciare la scansione con il pulsante; ignorare l’avviso non invia nulla. Evita due notifiche per lo stesso mancato invio, ma richiede che il ripiego distingua la scansione automatica dagli invii manuali e conservi la relativa istruzione.

## Where in the code

extension/src/host/agent.ts: openChat, launchAgent; extension/src/host/controller.ts: approvalOptions; extension/src/host/cursor.ts: toClipboard, openCursorChat
