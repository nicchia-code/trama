---
technical: false
refs:
  - agent-hook
  - requirements/tech#agent-hook
  - requirements/quality#agent-terminal
---
# Hook dei terminali contro ask

Nei terminali che Trama avvia, l'hook di Trama rifiuta lo strumento di domande dell'agente, in ogni sessione, principale e sotto-agenti, e gli risponde con il messaggio di rifiuto comune (definito una volta sola nel codice condiviso, vedi `tech#question-round`) di chiedere solo con `trama ask`. Il rifiuto non contatta l'editor e non dipende da lui.

- omp: il modulo `extension/src/omp/trama-hook.ts` ascolta anche `tool_call`; quando `TRAMA_TERMINAL` è impostata e il tool è `ask`, ritorna `{ block: true, reason }` con il messaggio di rifiuto. Per ogni altro tool non ritorna nulla. Senza `TRAMA_TERMINAL` il modulo continua a non fare nulla. Non si usa `--tools`.
- Claude Code: l'oggetto di `--settings` costruito in `agentTemplate` (`extension/src/host/terminal-agent.ts`) ha anche la voce `PreToolUse` con `matcher` `AskUserQuestion` e il comando `<trama> agent-event question-tool`, timeout 3, citato come gli altri hook anche su Windows (Git Bash). Il nuovo sottocomando `trama agent-event question-tool` non legge nulla e non contatta l'editor: scrive su standard output il JSON `hookSpecificOutput` con `permissionDecision: "deny"` e il messaggio di rifiuto come `permissionDecisionReason`, ed esce con 0. Non si usa `--disallowedTools`.
- `agent-event idle` e gli hook di fine lavoro restano come sono; l'unico caso in cui gli hook dei terminali bloccano qualcosa è questo rifiuto.

Fatto quando: in un terminale di Trama, con omp e con Claude Code, l'agente che prova il suo strumento di domande riceve il messaggio di rifiuto e nessuna domanda compare; un omp avviato fuori da un terminale di Trama può ancora usare `ask`. I test coprono il rifiuto di omp (con e senza `TRAMA_TERMINAL`, con `ask` e con un altro tool), l'oggetto `--settings` con la nuova voce e l'uscita di `trama agent-event question-tool`.
