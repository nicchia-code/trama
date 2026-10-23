---
technical: false
refs:
  - drift
---
# Drift: advisor solo omp

L'advisor che, con l'Advisor Scanner, guarda un Run al posto degli scan e registra Drift è solo l'advisor di omp: non esiste più il sotto-agente di revisione `trama-advisor` della chat di Cursor. Un Drift registrato dall'advisor resta senza origine, indistinguibile dagli altri, e blocca come ogni Drift. Con l'Async Drift Resolver la domanda pronta è preparata alla fine del lavoro allo stesso modo nel terminale come in omp Chat, compresi i Drift registrati dall'advisor durante il Run; nessun ramo per la chat di Cursor.

Codice da cambiare (indicazioni): togliere ogni revisore dei Drift diverso dall'advisor di omp: `ADVISOR_CHAT_SENTENCE` in `src/core/advisors.ts` (usata in `extension/src/host/agent.ts` ~:630 e ~:641), la voce `trama-advisor` di `src/core/sub-agents.ts` e le richieste di revisione a `trama-advisor` in `extension/src/host/drift-resolution.ts` (~:520, :539, :547). Restano `ADVISOR_SENTENCE` e `ADVISOR_INSTRUCTIONS` per l'advisor di omp. Aggiornare o eliminare i test che verificano quelle frasi per la chat.
