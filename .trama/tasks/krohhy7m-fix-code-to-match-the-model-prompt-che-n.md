---
column: done
technical: false
refs:
  - editor-chat
drift: nux1t791
proposal: null
agent: false
created: 2026-10-18T13:09:27.647Z
finished: 2026-10-18T13:12:33.661Z
---
# Fix code to match the Model: Prompt che nomina una skill

## What happens

Una conversazione diventa di Trama solo se il prompt inizia con `Use the trama-` o con `/trama-`, e riconosce come skill di Trama qualunque nome `trama-…`. `SKILL_PROMPT` in `src/core/cursor-chat.ts` e in `src/core/copilot-chat.ts` guarda solo l'inizio del prompt. Un prompt del developer che nomina `trama-design` a metà frase non rende la conversazione di Trama; un prompt che inizia con `Use the trama-req-…`, cioè con una skill dei Requisiti, la rende di Trama.

## What should happen

L'Actor `editor-chat` dice che riguarda le conversazioni in cui è stato inviato un prompt che nomina, in qualunque punto e anche dopo `/`, una delle sei skill con cui Trama avvia un lavoro: `trama-design`, `trama-scan`, `trama-implement`, `trama-import`, `trama-resolve-drifts` e `trama-setup`, non seguiti da una lettera, una cifra o un trattino. Le skill `trama-req-*` non contano. Il codice non lo fa: riconosce solo l'inizio e accetta ogni `trama-`. Né il Modello né i Requisiti impediscono di riconoscere il nome in qualunque punto.

## Chosen option

**Riconoscere il nome in ogni punto del prompt**

Il riconoscimento cerca in tutto il prompt il nome intero di una delle sei skill, con il controllo del carattere che segue, e la stessa regola vale per Cursor e per Copilot. Costo: un prompt libero che nomina una skill diventa di Trama e riceve gli eventi della chat; nessun file o comando cambia.

## Where in the code

`src/core/cursor-chat.ts` (`SKILL_PROMPT`, usata da `parseCursorHook` per `beforeSubmitPrompt`); `src/core/copilot-chat.ts` (`SKILL_PROMPT`, usata da `parseCopilotHook` per `UserPromptSubmit`).
