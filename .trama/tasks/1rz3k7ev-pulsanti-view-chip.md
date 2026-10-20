---
column: done
technical: false
refs:
  - panel
  - developer.FOCUS_PROPOSAL
  - developer.FOCUS_TASK
  - developer.FOCUS_REF
  - developer.SHOW_DIAGRAM
  - developer.SHOW_REQUIREMENTS
  - requirements/ui#drift
drift: null
proposal: 7i7xi6ku
agent: false
created: 2026-10-20T22:13:26.911Z
finished: 2026-10-20T22:20:05.096Z
---
# Pulsanti View e chip

I pulsanti View e i chip dei riferimenti aprono la scheda giusta con un focus, invece di aprirla e basta.

Quando il Task è fatto:

- La scheda di un Task in `Active` ha `View on diagram` e `View requirements` come la scheda di una Proposal, prima di `Run` e `Open`, con le stesse icone; su entrambe le schede ognuno compare solo quando la sua scheda avrebbe almeno un passo (`rules#focus`). Tooltip e nomi accessibili come in `ui#focus`.
- In **Open**, `developer.FOCUS_PROPOSAL` porta in **Diagram** (View on diagram) o in **Requirements** (View requirements) con il focus di quella Proposal; `developer.FOCUS_TASK` fa lo stesso con il focus di quel Task.
- `developer.FOCUS_REF` porta in **Diagram** per un chip di un elemento del Modello, in **Requirements** per un chip di un Requisito e in **Specs** per un chip `specs#…`, che oggi apre il Diagramma senza effetto. Vale per i chip delle schede dei Task e dei Drift e per quelli dei Task nei dettagli di una voce di History, che chiudono prima la modale.
- I tooltip dei chip dei Drift sono `Show <riferimento> in Requirements`, `Show <riferimento> in Specs` o `Show <riferimento> on the diagram`.
- Un chip non filtra più la scheda Requirements: «Showing X · Show all» sparisce, e **Requirements** mostra sempre tutte le Aree con le sezioni del focus evidenziate. **Diagram**, **Requirements** e **Specs** descrivono ciò che si vede arrivando da un pulsante View o da un chip (vedi il Focus).
- Arrivare con un pulsante o un chip sostituisce sempre il focus e la Proposal disegnata di prima nella scheda di arrivo; le altre schede restano com'erano.
- `developer.SHOW_DIAGRAM` e `developer.SHOW_REQUIREMENTS` restano il cambio di scheda e i link che non sono pulsanti View né chip.
