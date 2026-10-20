---
column: done
technical: false
refs:
  - panel/Settings
  - panel/Open/developer.SHOW_SETTINGS
  - requirements/ui#panel/Settings
  - requirements/tech#panel/Settings
drift: null
proposal: 534wkl22
agent: false
created: 2026-10-20T20:42:38.864Z
finished: 2026-10-20T20:43:42.685Z
---
# Casella Parallel Execution

- L'estensione dichiara `trama.experimentalParallelExecution`: booleano, `false` di default, `scope: "application"`, con la descrizione di `ui#panel/Settings`.
- Si legge solo il valore utente (`inspect(key).globalValue`). Un valore non booleano vale spento, così un repository clonato non può accenderlo.
- La scheda Settings la mostra nel gruppo `Experimental`, dopo `Experimental Advisor Scanner`, come casella di spunta con il titolo `Experimental Parallel Execution`, la «i» con la descrizione e lo stesso salvataggio immediato nelle impostazioni utente delle altre impostazioni.
- Il Settings state del pannello cita l'esecuzione parallela sperimentale fra le funzioni sperimentali.
- Test: un valore impostato solo nel workspace non accende l'esperimento.
