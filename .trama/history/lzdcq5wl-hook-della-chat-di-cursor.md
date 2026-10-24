---
created: 2026-10-18T10:53:56.426Z
updated: 2026-10-18T13:13:42.954Z
summary: La chat di Cursor riconosce le conversazioni di Trama anche dai comandi trama che registrano il lavoro dell'agente, e ogni hook raggiunge tutte le finestre del progetto senza attese reciproche.
tasks:
  - g6i3zfvc
  - cy8i66re
  - krohhy7m
cleared:
  krohhy7m:
    title: "Fix code to match the Model: Prompt che nomina una skill"
    finished: 2026-10-18T13:12:33.661Z
    refs:
      - editor-chat
  cy8i66re:
    title: "Fix code to match the Requirements: Hook di Cursor fermi all'attivazione"
    finished: 2026-10-18T13:11:30.575Z
    refs:
      - requirements/tech#editor-chat
  g6i3zfvc:
    title: Hook di Cursor affidabili
    proposal: xnoqi7ll
    tag: Ghost Cursor
    finished: 2026-10-18T10:53:01.305Z
    refs:
      - editor-chat
      - requirements/tech#editor-chat
      - requirements/quality#editor-chat
---
# Hook della chat di Cursor

La chat di Cursor riconosce le conversazioni di Trama anche dai comandi trama che registrano il lavoro dell'agente (annuncio, domanda, nuova Proposal, Task preso in In progress), e un prompt che nomina una skill di Trama la riconosce in qualunque punto del testo, non solo all'inizio. Il comando e il suo output non arrivano mai all'editor, solo l'esito del riconoscimento.

Le voci di Trama nel file degli hook di Cursor vengono scritte anche a ogni attivazione dell'estensione in Cursor, non solo a init e Update skills: il percorso del programma cambia a ogni aggiornamento e Cursor non eredita il PATH dell'estensione. Il file si riscrive solo quando le voci di Trama cambiano, e un file non valido viene segnalato a ogni attivazione.

L'hook arriva a ogni finestra aperta sul progetto, ciascuna per conto suo: una finestra lenta o ferma non ritarda le altre. Il prompt ha un secondo di attesa, gli altri hook cinque secondi.
