---
column: done
technical: false
refs:
  - setup-wizard
  - requirements/rules#setup-wizard
  - requirements/tech#setup-wizard
  - requirements/ui#setup-wizard
drift: null
proposal: nr388hz3
agent: false
created: 2026-10-23T14:00:42.300Z
finished: 2026-10-23T14:04:56.927Z
---
# Wizard: passo Agent solo omp

Il passo Agent del wizard parla solo di omp, l'unico agente: niente scelta dell'agente e niente `trama.agent`. Le chiavi del passo sono, sempre visibili e sempre nel riepilogo, `trama.ompPath`, `trama.terminalLocation` e `trama.ignoreInstructionFiles`. Il passo verifica omp ogni volta che si mostra o che il percorso di omp cambia: «Checking omp…» con `Loader`, poi «omp answered with <N> models.» oppure il motivo con « You can go on and fix it later.» (stessi testi di oggi); una verifica fallita resta un avviso. Spariscono i testi «Cursor's chat is available.» e «Cursor's chat works only in Cursor…».

La ricerca dei file di istruzioni resta identica (`.cursorrules` e `.cursor/rules/` compresi, perché omp li legge); la nota sull'esclusione compare solo in base a `trama.ignoreInstructionFiles` nei valori del wizard. Il passo Models suggerisce i modelli dichiarati dall'omp del percorso scelto nel passo Agent, anche non salvato. Il passo Advanced elenca, dopo le altre impostazioni del gruppo Features, `trama.ompChat` e `trama.ompChatApproval`.

Messaggi (`tech#setup-wizard`): `agentCheckWanted { ompPath }`, `modelSuggestionsWanted` con solo `ompPath` facoltativo, risposta `agentCheck { ompPath, ok, models?, error? }`; nessun campo `agent`. La verifica nell'host è sempre `ompModels` con il percorso dato; una risposta per un `ompPath` diverso da quello del passo si ignora.

Codice da cambiare: `extension/src/webview/wizard/logic.ts` (togliere `OMP_ONLY_KEYS`, `chosenAgent`, il filtro di `visibleKeys` per agente, il ramo Cursor di `agentCheckLine`; `STEP_KEYS` senza `trama.agent` e con le due chiavi di omp Chat in Advanced; `ignoresInstructionFiles`, `summaryRows`, `changedWrites` senza agente), `extension/src/webview/wizard/controller.ts` (righe ~193-201 e ~331-342: chiave della verifica solo `ompPath`), `extension/src/webview/wizard/index.tsx` (riga ~113), `extension/src/host/controller.ts` `checkAgent` (righe ~298-306, niente `isCursor()`), `protocol.ts` e `messages.ts` (campi `agent` dei messaggi del wizard e loro validazione).

Test: aggiornare `test/wizard-logic.test.ts` (casi `visibleKeys` con "cursor", lunghezza di Advanced ora 8, `agentCheckLine` senza `agent` e senza i casi Cursor, testo «Checking omp…», nota sull'esclusione senza agente) e i test dei messaggi del wizard che usano `agent`.
