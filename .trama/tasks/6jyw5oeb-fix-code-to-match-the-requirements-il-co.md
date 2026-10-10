---
column: done
technical: true
refs:
  - requirements/rules#agent-launching
  - requirements/tech#agent-launching
  - requirements/ui#agent-launching
drift: u016lvxg
proposal: null
agent: false
created: 2026-10-10T14:15:26.902Z
finished: 2026-10-10T18:28:21.383Z
---
# Fix code to match the Requirements: Il confronto delle Machine richiede ancora smistamento e modello di analisi

## What happens

Le istruzioni di scansione e implementazione inviate a omp o Claude Code chiedono ancora uno smistamento delle Machine con trama-triage e il confronto approfondito soltanto di quelle dichiarate in conflitto. Lo smistamento usa il modello di esecuzione; il confronto usa quello di analisi, anche quando il developer ha scelto un diverso modello di scansione. Claude Code riceve entrambe le definizioni. Le descrizioni dei ruoli nelle impostazioni attribuiscono ancora analisi al confronto ed esecuzione allo smistamento.

## What should happen

Ogni Machine dell’ambito deve essere confrontata direttamente con il codice da trama-analysis, senza smistamento né Machine saltate. Le istruzioni che possono scansionare devono chiedere «Compare each Machine with the trama-analysis sub-agent.». Il confronto usa soltanto il ruolo trama.scan: con omp tramite slow, con Claude Code nella sola definizione di trama-analysis. Un ruolo di scansione vuoto lascia il predefinito previsto dall’agente. Le descrizioni dei ruoli devono attribuire i confronti a scansione, riservando analisi a design, import e Resolve Drifts ed esecuzione ai Task.

## Chosen option

**Confrontare direttamente sul ruolo di scansione**

Eliminare dalle istruzioni lo smistamento e assegnare a trama-analysis il ruolo di scansione con entrambi gli agenti del terminale. Claude Code riceve soltanto il sotto-agente del confronto; omp non riceve più un ruolo di esecuzione destinato allo smistamento. Aggiornare le descrizioni dei ruoli rende riconoscibile questa scelta. Ogni Machine è letta e il costo del confronto dipende dal modello di scansione scelto dal developer.

## Where in the code

extension/src/host/terminal-agent.ts: agentTemplate, claudeAgents, subAgentSentence; src/core/sub-agents.ts: SUB_AGENTS; extension/src/host/agent.ts: terminalPrompt, terminalRun; extension/package.json: trama.analysis, trama.scan, trama.execution
