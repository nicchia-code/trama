---
refs:
  - diagram
  - requirements/ui#diagram
---
# Riquadro breve del Diagramma

Il riquadro che compare al passaggio del puntatore su un nodo o su un arco del Diagramma mostra solo il titolo dell'elemento e, sotto, la prima frase della sua descrizione (per un arco, della prosa della Transizione), senza elenchi di Transizioni, condizioni o altre righe. La frase si mostra intera, anche quando supera il limite dei tooltip; senza descrizione il riquadro mostra solo il titolo. Tutto il resto si legge nei dettagli, al clic, che non cambiano.

Oggi il testo del riquadro è costruito da `tooltipOf` in `extension/src/webview/diagram/details.ts` (titolo, descrizione intera e fino a 12 righe).
