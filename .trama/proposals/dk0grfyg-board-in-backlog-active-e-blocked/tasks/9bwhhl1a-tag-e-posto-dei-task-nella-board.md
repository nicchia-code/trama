---
technical: true
refs:
  - requirements/ui#task
---
# Tag della Proposal e posto dei Task bloccati nella Board

La Board del pannello non raggruppa più i Task in schede di design: ogni Task ha la sua scheda. Un Task che nasce da una Proposal porta un tag accanto al titolo, sulla sua scheda (in `Active` e in `Done`) e sulle sue righe dentro le altre schede: un chip con l'etichetta breve della Proposal, sempre intera. Per una Proposal senza etichetta, consegnata prima che le etichette esistessero, il chip mostra il titolo della Proposal, accorciato con i puntini oltre i 30 caratteri. Il tooltip è `From Proposal <id>: <titolo>`. Un Task che non nasce da una Proposal non ha tag. Il tag non è un pulsante e non fa nulla al clic.

Il colore del tag è scelto dall'etichetta fra i colori del tema dell'editor: la stessa etichetta ha sempre lo stesso colore, etichette diverse possono condividerlo. Il testo resta leggibile sul fondo in ogni tema e l'etichetta è sempre scritta, così il colore non è mai l'unico segnale.

Un Task bloccato non sta in Active ma in Blocked: dentro ogni Drift aperto che lo blocca, oppure nella scheda del Task di correzione che aspetta; se il Drift sta in una risoluzione consegnata, sta sotto la riga di quel Drift nella scheda gialla. Fa eccezione un Task preso dall'agente: resta in Active, mostra il blocco e passa in Blocked quando l'agente lo rilascia.

Il badge `no changes` resta sulla scheda del Task con lo stesso tooltip, nome accessibile e blocco `Check note`; sparisce il caso della riga dentro una scheda di design. Togliere dal webview le schede di design e il loro codice. Aggiornare i test del webview su schede di design, tag e posizione dei Task bloccati.
