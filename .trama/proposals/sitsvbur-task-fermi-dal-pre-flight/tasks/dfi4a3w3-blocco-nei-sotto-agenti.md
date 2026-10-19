---
technical: false
refs:
  - agent-terminal
  - requirements/tech#agent-terminal
  - requirements/quality#agent-launching
---
# Blocco nei sotto-agenti

Quando il developer ha acceso il blocco sperimentale dei Drift nelle sue impostazioni utente, il terminale che Trama apre per l'agente porta l'informazione che il blocco è acceso, così ogni agente che vi lavora, sotto-agenti compresi, la ritrova senza che l'agente principale gliela ripeta. Con il blocco spento il terminale non porta nulla. La frase dell'istruzione resta com'è, nel terminale e nella chat.

- Al lancio di ogni terminale dell'agente, `extension/src/host/agent.ts` aggiunge `TRAMA_DRIFT_BLOCKER=1` alle variabili d'ambiente del terminale (accanto a `TRAMA_AGENT`, `TRAMA_TERMINAL`, `TRAMA_QUESTION_ENDPOINT` e `TRAMA_JOB`) solo quando `trama.experimentalDriftBlocker` letto dal valore utente (`inspect(...).globalValue === true`) è acceso in quel momento; spento, la variabile non c'è. Vale per ogni istruzione nel terminale, da pulsante o dalla delega dei Drift, con omp e con Claude Code e in entrambe le posizioni del terminale.
- Un cambio dell'impostazione durante il lavoro non cambia i terminali già aperti.
- Un valore del workspace o della cartella non accende la variabile: la scrive solo l'estensione dal valore utente.
- Un test dell'host copre: impostazione utente accesa → la variabile c'è con valore `1`; spenta, assente o solo nel workspace → la variabile non c'è.
