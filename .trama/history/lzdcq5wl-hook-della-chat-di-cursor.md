---
created: 2026-10-18T10:53:56.426Z
updated: 2026-10-18T10:53:56.426Z
summary: La chat di Cursor riconosce le conversazioni di Trama anche dai comandi trama che registrano il lavoro dell'agente, e ogni hook raggiunge tutte le finestre del progetto senza attese reciproche.
tasks:
  - g6i3zfvc
---
# Hook della chat di Cursor

Una conversazione di Cursor diventa di Trama anche quando l'agente lancia un comando trama che registra il suo lavoro (annuncio, domanda, nuova Proposal, Task preso in In progress), non soltanto quando il prompt nomina una skill. Il comando e il suo output non arrivano mai all'editor, solo l'esito del riconoscimento.

L'hook arriva a ogni finestra aperta sul progetto, ciascuna per conto suo: una finestra lenta o ferma non ritarda le altre. Il prompt ha un secondo di attesa, gli altri hook cinque secondi.

Il file degli hook di Cursor viene riscritto solo quando le voci di Trama cambiano, e la costante di quiete rimasta senza usi è tolta.
