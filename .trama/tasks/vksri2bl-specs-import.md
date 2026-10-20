---
column: done
technical: false
refs:
  - proposal
  - requirements/rules#proposal
drift: null
proposal: 06r4ta4e
agent: false
created: 2026-10-20T21:50:47.661Z
finished: 2026-10-20T21:51:29.040Z
---
# Specs nell'import

La skill `trama-import` descrive le tecnologie del codice nelle Specs, come fa `trama-setup`, ma deducendole dai file del repository.

- **Dove.** La prima Proposal («Import: System and Actors») scrive `specs.yaml` con `{"edit":["specs.yaml"]}`, nel formato di `trama-design`.
- **Da dove.** I campi vengono da ciò che il repository dichiara: manifest, lockfile, configurazioni di test e di CI, Dockerfile, file di infrastruttura. Un campo che nessun file dichiara resta vuoto.
- **Come si scrivono le voci.**
  - Nessuna voce ha `chosenByAgent`.
  - La versione è solo quella principale dichiarata.
  - In `frameworks` vanno solo framework e librerie che danno forma al codice.
  - `notes` porta solo vincoli scritti nei file.
- **Requisiti `tech`.** Hanno solo vincoli e struttura, mai l'elenco di linguaggi, framework e librerie. La riga «Import only evident and stable Requirements» della skill cambia di conseguenza.
- **Specs già presenti.**
  - L'import le aggiorna: aggiunge voci e campi mancanti e corregge versione e nota delle voci esistenti.
  - Una voce che il codice non usa più resta e va fra i `## Doubts` della prima Proposal.
  - La regola «Never change what is already modelled» della skill nomina questa eccezione.
  - Se oltre alle Specs non c'è nulla di nuovo, la prima Proposal porta solo loro invece di essere saltata.
- **Resoconto.** Dice che le Specs sono state scritte o aggiornate.
- **Documentazione.** `docs/` descrive le Specs scritte dall'import.
