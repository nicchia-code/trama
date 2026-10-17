---
technical: true
refs:
  - requirements/rules#voce-history
---
# La skill `trama-implement` scrive e aggiorna le voci di History

Quando il Task è finito, la skill distribuita `trama-implement` (in `skills/`), alla fine di ogni corsa che ha portato in Done almeno un Task senza `--unchanged` (un Task singolo, tutti i Task in To do o il Run automatico delle correzioni), anche con la verifica finale fallita: dopo la verifica e l'eventuale scan mirato passa il controllo a History con `trama announce phase <id> history`, legge le voci con `trama history list` e `trama history show`, e racconta tutti quei Task almeno una volta, citando ognuno in una voce nuova (`trama history add`) o in una esistente aggiornata (`trama history update`). Raggruppa per macro-funzionalità leggendo titoli, corpi e Proposal dei Task e le voci già scritte; quando una voce racconta già la stessa funzionalità la aggiorna invece di scriverne un'altra. Scrive titolo, riassunto e testo nella lingua che l'istruzione chiede. Poi chiude il controllo e scrive il resoconto, che elenca le voci scritte o aggiornate.

Un sotto-agente non scrive voci; una corsa interrotta prima di questo passo non ne scrive; Trama non scrive mai voci da sola. Le skill `trama-scan`, `trama-design`, `trama-import` e `trama-resolve-drifts` non scrivono voci. Aggiornare le copie delle skill e i test che ne controllano il contenuto, se ci sono.
