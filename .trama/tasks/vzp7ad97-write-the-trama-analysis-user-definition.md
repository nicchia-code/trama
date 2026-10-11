---
column: done
technical: false
refs:
  - project/Not a Trama project/developer.INITIALIZE_PROJECT
  - project/Trama project/developer.UPDATE_SKILLS
  - requirements/rules#project
  - requirements/tech#agent-launching
  - requirements/quality#agent-launching
drift: null
proposal: dtpkqiid
agent: false
created: 2026-10-11T08:37:29.883Z
finished: 2026-10-11T08:41:00.197Z
---
# Write the trama-analysis user definition for Cursor and Copilot at initialization and Update skills

Oggi l'inizializzazione e Update skills fatti dall'editor installano solo gli hook dell'editor e le skill: nessuno scrive la definizione utente del sotto-agente `trama-analysis` per le chat, quindi in Cursor e Copilot la scansione non trova il sotto-agente e il modello di `trama.scan` non vale.

A lavoro finito, l'inizializzazione e Update skills fatti dall'editor (solo nell'estensione, in `extension/src/host`; mai in `src/core` né in `src/cli`, quindi `trama init` e `trama update-skills` dalla riga di comando non la toccano) scrivono la definizione dell'editor in uso, qualunque sia `trama.agent`: in Cursor (`vscode.env.appName` contiene «Cursor») `~/.cursor/agents/trama-analysis.md` con front matter `name: trama-analysis`, `description` e `model` (il valore di `trama.scan` come stringa YAML tra virgolette, oppure `inherit` se vuoto); altrimenti, in Copilot, `~/.copilot/agents/trama-analysis.agent.md` con `name`, `description` e `model` (stringa YAML tra virgolette) solo se `trama.scan` non è vuoto. Il corpo è il `prompt` di `SUB_AGENTS` (`src/core/sub-agents.ts`), lo stesso testo di omp e Claude Code. Le cartelle mancanti vengono create.

Regole: il file si riscrive sempre, senza confronto con il contenuto presente e senza chiedere; non conta mai come conflitto e non compare nel dialogo modale di conferma dell'inizializzazione. Nell'inizializzazione si scrive solo dopo che il progetto è stato creato, quindi mai se l'inizializzazione è rifiutata o annullata. Se il file non si può scrivere, il resoconto lo dice (come per i file degli hook), senza far fallire il resto. Le definizioni di omp (`.omp/agents/trama-analysis.md`) e il comportamento per Claude Code restano come sono.
