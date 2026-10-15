---
column: done
technical: false
refs:
  - panel/Settings
  - requirements/ui#panel/Settings
drift: null
proposal: z8d98pfq
agent: false
created: 2026-10-15T05:22:23.947Z
finished: 2026-10-15T05:28:39.273Z
---
# Lay out Settings in columns within each group

Quando il Task è finito, la scheda Settings usa lo spazio orizzontale del pannello:

- La pagina si allarga con il pannello fino a circa 1100 px, invece dei 680 px di oggi.
- I gruppi Agent, Models, Drift autopilot, Runs e Project restano uno sotto l'altro, ciascuno con il suo titolo su tutta la larghezza, anche quelli con una sola impostazione.
- Dentro un gruppo le impostazioni stanno affiancate in colonne di pari larghezza, larghe almeno circa 240 px, nell'ordine del gruppo; quando lo spazio non basta vanno a capo, fino a una colonna sola nei pannelli stretti, e la pagina non scorre mai di lato.
- In una stessa riga titoli, chiavi e controlli sono allineati alla stessa altezza anche se una chiave va a capo; errori di validazione e avvisi del workspace restano sotto il controllo, dentro la sua colonna.
- I campi di testo riempiono la loro colonna; il campo numerico e i menu restano larghi quanto il contenuto senza superare la colonna.
- Il fumetto della «i» di un'impostazione in una colonna a destra resta dentro il pannello, senza farlo scorrere di lato; il suo comportamento (apertura, chiusura, link, valore evidenziato) e l'accessibilità della scheda non cambiano.
