---
column: done
technical: true
refs:
  - requirements/quality
  - requirements/rules
  - requirements/tech
  - requirements/ui
drift: null
proposal: nr388hz3
agent: false
created: 2026-10-23T14:00:42.300Z
finished: 2026-10-23T14:19:27.360Z
---
# Via hook e Advisor chat

Tutto il codice che seguiva la chat di Cursor attraverso i suoi hook sparisce, insieme all'Advisor della chat, senza ripieghi e senza pulizia dei file già scritti per Cursor sulla macchina del developer. Le sezioni `quality#editor-chat`, `tech#editor-chat`, `tech#chat-advisor`, `rules#chat-advisor` e `ui#chat-advisor` non esistono più. Alla fine:

- `src/core/cursor-chat.ts` non esiste più (`CursorHook`, `parseCursorHook`, `parseShellHook`, `writeCursorHooks`, `ChatState`, `CursorConversations`, `completedCommandAnswer`, `SKILL_PROMPT`, `workingTreeSnapshot` e il resto), né la sua prova `test/cursor-chat.test.ts`.
- `extension/src/host/cursor.ts` non esiste più: le parti della chat (`isCursor`, `cursorHooksFile`, `onCursorChatEvent`, `publishChatState`, `receiveCursorHook`, `openCursorChat`, `deeplinkAccepts`, `withTramaPath`, `withAskLine`) spariscono; i lettori dei file inclusi nel pacchetto (`bundledTrama`, `bundledOmpHook`, `bundledUnifyInstructions`, `bundledAskMoreInstructions`) passano in un modulo dell'host che non riguarda Cursor.
- L'estensione non scrive più `~/.cursor/hooks.json` (`installCursorHooks`, `installEditorHooks` in `extension/src/host/project.ts` e la loro chiamata all'attivazione in `extension/src/host/main.ts`), e non legge, non riscrive e non cancella le voci di Trama già presenti lì né `~/.cursor/agents/trama-*.md`.
- L'Advisor della chat sparisce: il blocco dell'Advisor della chat in `extension/src/host/drift-resolution.ts` (`chatAdvisorEvent`, `watchedAgent`, `chatAdvisorSubagentStarted`, `chatAdvisorTaskTaken`, `FinalReviewMissing`, `jobFinalReviewMissing`, `onFinalReviewMissing`, `setChatStatePublisher`, `receiveAdvisorReview`), il file di stato delle finestre per gli hook, la definizione `trama-advisor` di `src/core/sub-agents.ts`, l'avviso della Board «Run finished without the Advisor's final review» e `test/host-chat-advisor.test.ts`.
- `src/core/question-channel.ts` non manda né riceve più messaggi degli hook di Cursor (`sendCursorHook`, `onCursorHook`, `readChatStates`, `editorsReply`), e `extension/src/host/questions.ts` non registra più `receiveCursorHook`.
- Nessun file del repository (codice, test, skill, documenti, `extension/package.json`) nomina più Cursor come agente o editor supportato, salvo la nuova ADR, il `CHANGELOG.md` e le citazioni che non riguardano il supporto (le regole di Cursor che omp legge, nell'esclusione dei file di istruzioni).

La suite intera (`bun test`), il type-check (`tsc --noEmit` e quello dell'estensione) e la build dell'estensione passano dopo la rimozione.
