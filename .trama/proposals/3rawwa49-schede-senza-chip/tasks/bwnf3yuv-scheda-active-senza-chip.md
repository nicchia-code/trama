---
technical: false
refs:
  - panel/Board
  - developer.FOCUS_REF
  - requirements/ui#panel/Board
---
# Scheda Active senza chip

La scheda di un Task nella colonna `Active` della Board non mostra più la riga dei chip dei riferimenti, di nessun tipo: né gli elementi del Modello (per esempio `cosa-da-fare`, `google.TASK_COMPLETATA`), né le sezioni dei Requisiti (`requirements/<area>#<sezione>`), né le Specs (`specs#<campo>`). Nessuna scheda della Board mostra più chip dei riferimenti: quella di un Task in `Done` e quella rossa di un Drift già non li hanno.

Quando il lavoro è finito:

- La scheda di un Task in `Active` conserva tutto il resto: pallino, numero, titolo, badge (`blocked`, `waiting`, percentuale), bordo del tag, bordo animato e i pulsanti `View on diagram`, `View requirements` e `Run`, che continuano a portare al Diagramma e ai Requisiti con il focus su tutti i riferimenti del Task, con le regole di oggi.
- Il badge `technical` compare sulla scheda di ogni Task tecnico, con o senza riferimenti (oggi compare solo per un Task tecnico senza nessun riferimento).
- I chip dei riferimenti restano, con gli stessi collegamenti e tooltip di oggi (`Show <riferimento> on the diagram`, `… in Requirements`, `… in Specs`), nella modale dei dettagli di un Task, anche Done, nella modale dei dettagli di un Drift e fra i Task dei dettagli di una voce di History: seguire uno di quei chip è `developer.FOCUS_REF`, e un chip di un elemento del Modello porta al Diagramma, uno di un Requisito ai Requisiti, uno delle Specs alle Specs.
- Cliccare la scheda in ogni suo punto fuori da pulsanti, badge e popup apre ancora la modale dei dettagli del Task.

Le prove della Board che guardano la scheda di un Task in `Active` coprono un Task con riferimenti misti (Modello, Requisiti, Specs): la scheda non ha chip e la modale dei dettagli li ha tutti.
