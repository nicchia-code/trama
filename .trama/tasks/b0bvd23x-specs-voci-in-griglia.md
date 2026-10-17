---
column: done
technical: false
refs:
  - panel/Specs
  - requirements/ui#panel/Specs
drift: null
proposal: 8j3362b9
agent: false
created: 2026-10-16T09:37:44.326Z
finished: 2026-10-16T10:15:46.635Z
---
# Specs: voci dei campi in una griglia come in Settings

A Task finito, la scheda Specs usa lo spazio orizzontale come la scheda Settings:

- La pagina si allarga con il pannello fino a circa 1100 px (oggi si ferma a circa 980 px).
- I campi stanno uno sotto l'altro, nell'ordine fisso, ciascuno su tutta la larghezza della pagina, anche con una sola voce.
- Dentro un campo le voci stanno affiancate in una griglia di colonne di pari larghezza, larghe almeno circa 300 px, nell'ordine del campo da sinistra a destra; vanno a capo quando manca spazio, fino a una colonna sola nei pannelli stretti. La pagina non scorre mai di lato.
- Le voci di una riga partono tutte dall'alto, con le teste (icona, nome, versione, badge) alla stessa altezza, e ciascuna è alta quanto il suo contenuto; il bordo colorato di una voce aggiunta, cambiata o tolta segue solo la sua voce. Nome, versione, badge e nota vanno a capo dentro la colonna, senza superarla.
- Il campo Notes resta testo libero, non in griglia: il suo testo, e quello di prima quando la Proposal disegnata lo cambia, occupa tutta la larghezza della pagina.

Selettore della Proposal, riquadro degli errori, etichette delle modifiche e badge `chosen by agent` restano come sono.
