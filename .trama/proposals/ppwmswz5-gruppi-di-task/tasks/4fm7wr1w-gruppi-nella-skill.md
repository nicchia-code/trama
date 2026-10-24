---
technical: false
refs:
  - task
  - requirements/rules#agent-launching
  - requirements/tech#agent
---
# Gruppi nella skill

Con Parallel Execution, la skill `trama-implement` pianifica la corsa sui gruppi che Trama propone, e ogni gruppo va a un solo sotto-agente `trama-implementer` che ne realizza al più tre Task uno dopo l'altro.

Quando è fatto:
- Sezione "Parallel execution" di `skills/trama-implement/SKILL.md`, punto "Ask": l'agente principale chiede `trama task list` con `runnable: true`, `groups: true`, `max: <N>` e i filtri dell'istruzione, invece della sola lista con `heldBack`.
- Punto "Plan": oltre a vie libere e ordini, l'agente può dividere un gruppo i cui Task dal testo non si toccano e unire due gruppi che dal testo dipendono l'uno dall'altro o toccano le stesse cose, ogni volta con un motivo di una riga. Una divisione si registra con `trama timing new` come `release`, un'unione come `order`. Un gruppo al lavoro occupa un posto del limite.
- I gruppi partono nell'ordine che Trama dà. Ogni gruppo va a un sotto-agente `trama-implementer` con al più 3 Task in ordine; i Task oltre il terzo, e quelli che il sotto-agente riporta non iniziati, vanno a un sotto-agente nuovo con il riassunto del primo, appena c'è un posto e nessun ordine li trattiene.
- Punto "Revise": il piano si rivede quando un sotto-agente torna, quando nasce un Task eseguibile e quando un Task si blocca, chiedendo di nuovo i gruppi per i posti liberi.
- Punto "Conflicts": un sotto-agente fermato da un conflitto o da una prenotazione riporta i Task non iniziati del gruppo, che tornano al piano.
- Il prompt di `trama-implementer` (`src/core/sub-agents.ts`) accetta un gruppo di 1-3 Task: li realizza in ordine senza tornare fra l'uno e l'altro, usa il codice già letto, salta e riporta un Task bloccato, lascia in `doing` un Task fermato da un Drift e passa al successivo, si ferma con tutto il resto del gruppo quando una prenotazione lo ferma, e torna con l'esito di ogni Task e, per i Task non iniziati, un riassunto di una riga per file letto e delle scelte fatte. Il prompt resta sotto i 6 KB.
- Senza Parallel Execution la skill e il sotto-agente lavorano come prima, un Task per sotto-agente.
- Testo della skill in inglese; le skill installate nei progetti si rigenerano dalle sorgenti.
