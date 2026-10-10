---
column: done
technical: false
refs:
  - agent-terminal
  - requirements/rules#agent-terminal
  - requirements/tech#agent-terminal
  - requirements/tech#agent-launching
  - requirements/ui#agent-terminal
drift: 7b80em4a
proposal: null
agent: false
created: 2026-10-10T14:15:26.797Z
finished: 2026-10-10T18:04:51.105Z
---
# Fix code to match the Model: La scelta dell'agente dipende ancora dai launcher e dai comandi precedenti

## What happens

L'invio usa ancora le impostazioni dei launcher, dell'agente del terminale e del comando personalizzato. Senza una scelta precedente, Cursor usa la chat ma gli altri editor chiedono quale agente avviare nel terminale. Sono ancora disponibili Codex, Copilot CLI, Cursor CLI e comandi arbitrari; la scelta prevista da trama.agent non governa gli invii. Anche la scansione automatica può restare esclusa perché nessun agente del terminale è stato scelto.

## What should happen

Ogni invio deve leggere trama.agent: chat predefinita in qualsiasi editor, oppure omp o Claude Code in un terminale integrato nuovo. La posizione dipende soltanto da trama.terminalLocation. Non ci sono domande al primo avvio, altri agenti o comandi personalizzati; le vecchie impostazioni sono ignorate senza riscriverle. La scelta vale anche per import, progetto nuovo e scansione automatica.

## Chosen option

**Usare soltanto la scelta globale prevista**

Adottare trama.agent con chat predefinita e trama.terminalLocation per la posizione del terminale, eliminando le scelte iniziali e ignorando le impostazioni precedenti. Tutte le istruzioni seguono la stessa scelta, scansione automatica compresa. I valori utente esistenti restano intatti, ma chi usava un agente diverso deve scegliere uno dei due agenti del terminale supportati.

## Where in the code

extension/package.json; extension/src/host/agent.ts: agentLauncher, configuredTerminalAgent, terminalAgent, launchAgent, agentReady; extension/src/host/terminal-agent.ts: KNOWN_AGENTS, effectiveAgent; extension/src/host/controller.ts: approvalOptions
