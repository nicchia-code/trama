---
column: done
technical: false
refs:
  - project
drift: null
proposal: n97kq4ls
agent: false
created: 2026-10-21T11:33:12.145Z
finished: 2026-10-21T11:35:13.854Z
---
# Sotto-agenti e hook installati

Quando il developer inizializza un progetto (INITIALIZE_PROJECT) o aggiorna le skill (UPDATE_SKILLS), in Cursor Trama installa o riscrive, senza chiedere e sostituendo copie vecchie o modificate, le definizioni utente di entrambi i sotto-agenti di Trama per la chat di Cursor: `trama-analysis` (confronto) e il nuovo `trama-advisor` (revisione dell'Advisor Scanner), con il modello di scansione attuale, e le voci di Trama nel file degli hook di Cursor (scritto da `writeCursorHooks` in `src/core/cursor-chat.ts`, con le nuove voci per la revisione dopo ogni modifica dei file, la fine dei sotto-agenti dei Task, la fine del turno dell'agente principale e il `preToolUse` Shell che completa i comandi `trama`).

A ogni apertura ordinaria di Trama dall'editor (OPEN_PANEL), anche con il pannello già aperto, il controllo in sottofondo di ciò che Trama installa per l'agente considera, in Cursor, le definizioni utente di tutti e due i sotto-agenti di Trama (`checkSkills` in `extension/src/host/project.ts`, con `installChatSubAgent(false)`): se differiscono da questa versione, Trama le aggiorna come fa per le altre cose installate. Le voci degli hook restano fuori da questo controllo: le scrivono l'attivazione dell'estensione in Cursor, l'inizializzazione e Update skills, come oggi. Il writer delle definizioni (`chat-sub-agent.ts` / `src/core/sub-agents.ts`) produce anche quella di `trama-advisor`.
