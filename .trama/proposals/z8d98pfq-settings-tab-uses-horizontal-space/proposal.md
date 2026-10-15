---
status: approved
base:
  requirements/ui/panel.md: 0768f8d55c265705f85326b5647168a507b02bdf9da19dccca231c8be3be53b7
delete: []
created: 2026-10-15T05:21:32.782Z
---
# Settings tab uses horizontal space

La scheda Settings usa male lo spazio orizzontale: ogni impostazione occupa una riga intera in una pagina larga al massimo 680 px. Decisioni:
- Dentro un gruppo le impostazioni stanno in una griglia di colonne di pari larghezza (minimo circa 240 px) che va a capo, fino a una colonna sola nei pannelli stretti.
- La pagina si allarga fino a circa 1100 px.
- I gruppi restano uno sotto l'altro, anche quelli con una sola impostazione.
- In una riga della griglia titoli, chiavi e controlli sono allineati alla stessa altezza.
Assunzioni da verificare:
- I campi di testo occupano tutta la larghezza della loro colonna; il campo numerico resta stretto.
- Il fumetto della «i» resta dentro il pannello anche nelle colonne a destra.
