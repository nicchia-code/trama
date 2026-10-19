---
technical: false
refs:
  - drift
  - requirements/rules#drift
  - requirements/rules#work
  - requirements/tech#drift
---
# Giudizio del pre-flight

Il pre-flight di un Run giudica sempre, anche con il blocco sperimentale spento, quali dei Task che un suo Drift bloccherebbe la differenza tocca davvero, e lascia liberi gli altri con un motivo ciascuno (`notBlocking`). Una differenza già presente nel codice, trovata su un elemento che un Task nomina ma che non riguarda il suo lavoro, non ferma più quel Task. Con il blocco spento, un Drift del pre-flight che non blocca nessun Task resta un Drift aperto in Blocked e non entra in una risoluzione `nonBlocking`. Con il blocco acceso, chi registra Drift lo sa anche dal testo dei comandi, non solo dalla frase dell'istruzione.

Riga di comando (`src/core` per il calcolo, `src/cli` per l'uscita):
- `trama compare brief` accetta `--pre-flight`. Con `--pre-flight`, oppure con `TRAMA_DRIFT_BLOCKER=1` nell'ambiente (solo il valore esatto `1`), il briefing porta i candidati come con `--candidates` e, subito dopo l'ID del confronto, la riga `Drift blocker: for every Drift you file, judge its candidate Tasks and leave free, with a reason, each Task the difference does not touch.`; con `--json` porta `candidates` e `judgeBlocking: true`. Senza l'una e l'altra l'uscita non cambia.
- Con `TRAMA_DRIFT_BLOCKER=1`, anche `trama task show` (dopo i blocchi del Task) e `trama drift candidates` stampano la stessa riga, e con `--json` `judgeBlocking: true`; senza la variabile la loro uscita non cambia.
- La CLI continua a non leggere le impostazioni dell'editor.

Skill e sotto-agenti:
- `skills/trama-compare/SKILL.md`, `skills/trama-implement/SKILL.md` e `skills/trama-import/SKILL.md`: la sezione "Experimental Drift blocker" vale quando l'istruzione porta la frase oppure quando il briefing, `trama task show` o `trama drift candidates` portano la riga del giudizio. Il giudizio segue il criterio di `rules#work`: un Task è toccato quando realizzarlo cambia il comportamento o il codice che la differenza descrive, oppure quando la decisione del developer sul Drift può cambiare ciò che il Task deve fare; non basta che nomini lo stesso elemento o una sezione di Requisiti che lo contiene. La risoluzione `nonBlocking` di fine lavoro si scrive solo con il blocco acceso, non per la sola riga del pre-flight.
- Il prompt del sotto-agente `trama-analysis` (`src/core/sub-agents.ts`) dice di giudicare i candidati quando l'incarico porta la frase o il briefing porta la riga del giudizio.
- Le copie installate nel repository (`.agents/skills/…`, `.omp/agents/trama-analysis.md`) si aggiornano con Update skills, non a mano.

Documentazione: `docs/cli.md` descrive `--pre-flight`, la variabile `TRAMA_DRIFT_BLOCKER` e la riga del giudizio; `extension/README.md` e `CHANGELOG.md` dicono che il pre-flight giudica sempre e che il blocco sperimentale arriva ai sotto-agenti del terminale.

Test: il briefing con `--pre-flight` e senza variabile ha candidati e riga; senza `--pre-flight` e senza variabile non ha né l'una né l'altra; con `TRAMA_DRIFT_BLOCKER=1` l'hanno briefing, `task show` e `drift candidates`; con `TRAMA_DRIFT_BLOCKER=0` o vuota no.
