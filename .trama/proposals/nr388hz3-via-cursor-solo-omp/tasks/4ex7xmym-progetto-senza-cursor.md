---
refs:
  - project
  - requirements/rules#project
  - requirements/tech#project
---

# Progetto senza pezzi di Cursor

Inizializzare un progetto, Update skills e il controllo in sottofondo a ogni Open Trama non scrivono più nulla per Cursor, in nessun editor. Inizializzare scrive le skill, `.omp/agents/trama-analysis.md` e `.omp/WATCHDOG.yml` (anche con l'Advisor Scanner spento) e basta. Update skills e il controllo all'apertura fanno gli stessi passi di oggi su skill, file di omp, skill ritirate e skill di Requisiti, più la pulizia di Copilot, senza la definizione utente dei sotto-agenti della chat di Cursor né gli hook di Cursor.

Da togliere in `extension/src/host/project.ts`: `installCursorHooks`, `installEditorHooks`, `installChatSubAgent` e le loro chiamate in `initializeProject` (righe ~109-112), `updateSkills` (righe ~133-139, comprese le righe di resoconto «Chat sub-agent definition written…») e `checkSkills` (righe ~151-155: l'avviso «skill aggiornate» dipende solo dal refresh e dai pezzi di Copilot tolti); l'import di `cursorHooksFile`/`isCursor`. In `extension/src/host/main.ts` (riga ~87) sparisce la chiamata a `installEditorHooks` all'attivazione. Il file `extension/src/host/chat-sub-agent.ts` si cancella; `writeCursorHooks` in `src/core/cursor-chat` resta solo se usato altrove (altrimenti va via con la sua parte).

Pulizia di Copilot in ogni editor (`tech#project`): `removeCopilotPieces` perde il ramo `isCursor()` (riga ~57): a ogni attivazione, al controllo all'apertura e a Update skills fatto dall'editor cancella `copilot-hooks.json` in `globalStorageUri` se c'è e toglie da `chat.hookFilesLocations` solo la sua voce (`ConfigurationTarget.Global`), oltre all'agente `~/.copilot/agents/trama-analysis.agent.md`. Un errore all'attivazione non mostra nulla; al controllo e a Update skills è un errore come gli altri di quei passi.

Ciò che le versioni precedenti installavano per Cursor (voci di Trama in `~/.cursor/hooks.json`, `~/.cursor/agents/trama-analysis.md` e `trama-advisor.md`) resta com'è: nessun codice lo legge, lo riscrive o lo cancella. Nessun conflitto all'inizializzazione riguarda più file di Cursor.

Test: in `test/host-project-hooks.test.ts` togliere i casi su `installEditorHooks` e sugli hook/sotto-agenti di Cursor; i casi di `removeCopilotPieces` devono valere in ogni editor (nessun finto `appName` Cursor che salti la pulizia). Togliere i test di `chat-sub-agent.ts` se esistono.
