---
technical: false
refs:
  - drift
  - requirements/data#drift
  - requirements/rules#drift
  - requirements/tech#drift
  - requirements/ui#drift
  - requirements/rules#task
---

# Un Drift può lasciare liberi i Task che la differenza non tocca

Quando il Task è finito, un Drift può nominare alla creazione i Task che lascia liberi, ciascuno con un motivo, e quei Task non sono bloccati da lui; tutti gli altri, compresi quelli nati dopo che riguardano la stessa cosa, sono bloccati come oggi. Senza `notBlocking` tutto resta com'è.

**Dati.** Il front matter del Drift ha il campo `notBlocking`: lista di `{ task, reason }` nell'ordine in cui sono stati nominati, senza doppioni, scritta solo alla creazione e mai più cambiata. Assente o vuota, il Drift blocca come prima e i Drift esistenti non sono riscritti. Un elemento senza `task` o senza `reason` è un errore di lettura. Un Task citato che non esiste più resta nella lista e non conta. `trama ids rewrite` porta alla nuova identità anche i Task citati in `notBlocking`. Lettura e scrittura in `src/core` accanto agli altri campi del Drift.

**Creazione.** `trama drift new` accetta `--not-blocking <task>` ripetibile (identità permanente o numero breve, convertito in identità prima di scrivere), ciascuno seguito dal suo `--not-blocking-reason <testo>`, accoppiati in ordine come `--option` e `--option-text`. La creazione è rifiutata, nominando il Task, per un Task inesistente, ripetuto, senza motivo (o con motivo vuoto) o che il Drift non bloccherebbe: il controllo usa la stessa funzione dei blocchi (`computeBlocked`, origine compresa).

**Candidati.** Nuovo comando `trama drift candidates --ref <ref>… [--task <origine>] [--json]`: stampa senza scrivere nulla i Task che un Drift nuovo con quei riferimenti e quell'origine bloccherebbe (identità, numero breve, titolo), calcolati in `src/core` con `computeBlocked`. Se non ce n'è nessuno lo dice in una riga ed esce con 0. Un riferimento che non si risolve o un Task inesistente è un errore d'uso.

**Blocchi.** `computeBlocked` (`src/core/blocking.ts`) salta per quel Drift i Task del suo `notBlocking`, sia come blocco del Drift sia come attesa dell'origine sul Task di correzione: un'origine lasciata libera non è bloccata da quel Drift, non torna in To do e non aspetta il Task di correzione quando il codice del Drift si corregge. Gli altri Drift aperti la bloccano come sempre. Così `task next`, `--batch`, il pre-flight, la Board, la Snapshot e il rifiuto di In progress cambiano senza altro codice.

**Visualizzazione.** `trama drift list`, `show`, `trama board`, la Snapshot e i `--json` dei Drift portano `notBlocking`. `trama drift show` ha, dopo "Where in the code", un blocco "Not blocking" con una riga per Task (`<numero o identità> <titolo>: <motivo>`, `(no longer exists)` al posto del titolo per un Task sparito). Nella Board, sulla scheda rossa e sulla riga del Drift nella scheda gialla di una risoluzione, sotto i Task che blocca, una riga di testo secondario `Not blocking: T3, T5` con i numeri brevi dei Task liberati (identità permanente per un Task senza numero; i Task spariti non compaiono); ogni numero ha tooltip e nome accessibile `Not blocked by this Drift: <motivo>` e non apre nulla. Nei dettagli del Diagramma, dopo `Points at`, una sezione `Not blocking` elenca ogni Task liberato nel suo ordine con numero o identità, titolo e motivo. Senza Task da mostrare né riga, né sezione, né blocco.

**Skill e documentazione.** Le skill distribuite `skills/trama-scan` (anche pre-flight e scansione di fine corsa), `skills/trama-implement` e `skills/trama-import` hanno una sezione "Experimental Drift blocker" che vale solo quando l'istruzione porta la frase del blocco sperimentale: prima di `trama drift new` chiedere i candidati con `trama drift candidates`, giudicare ciascuno (origine compresa), passare `--not-blocking` con il motivo per quelli che la differenza non tocca, mai aggiungere blocchi; inoltrare la frase ai sotto-agenti, che rendono le identità dei Drift registrati. Senza la frase non si nomina nessun Task. Il `prompt` di `trama-analysis` in `src/core/sub-agents.ts` dice di seguire la sezione quando il compito la nomina. `docs/cli.md` descrive `--not-blocking`, `--not-blocking-reason` e `trama drift candidates`; `CHANGELOG.md` registra le novità.
