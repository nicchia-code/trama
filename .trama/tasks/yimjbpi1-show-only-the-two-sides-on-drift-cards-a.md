---
column: done
technical: false
refs:
  - panel/Board
  - requirements/ui#drift
  - requirements/ui#proposal
  - requirements/tech#panel
drift: null
proposal: hlnh5d44
agent: false
created: 2026-10-09T07:15:08.734Z
finished: 2026-10-09T08:28:52.328Z
---
# Show only the two sides on Drift cards and details

La scheda di un Drift nella colonna To decide, e i suoi dettagli nel Diagramma che usano lo stesso confronto, mostrano solo il titolo e i due lati: What happens a sinistra, What should happen a destra con la parola Model o Requirements accanto, resi come Markdown, affiancati e impilati quando il pannello è stretto. La scheda tiene il suo link al Diagramma o al Requisito.

Oggi il confronto ha ancora tutto ciò che serviva a decidere su un singolo Drift, e va tolto:
- i due pulsanti `Keep this` con la riga della conseguenza sotto;
- il gruppo Fix options con i pulsanti radio e il campo della nota, con quanto il pannello ricorda della selezione;
- il riquadro della Proposal allegata (numero, titolo, file cambiati, stato, scheletro del rifacimento, pulsanti View diagram e View requirements): una Proposal allegata a un Drift aperto non è mostrata da nessuna parte del pannello;
- il blocco richiudibile Where in the code.

Nessun messaggio fra pannello e host decide su un singolo Drift: spariscono il messaggio della decisione e quello del clic su una decisione bloccata, e l'host non li accetta più; con quest'ultimo sparisce anche l'avviso con il pulsante Rework Proposal che lanciava il rifacimento della Proposal obsoleta. Nel pannello si decide sui Drift solo con Resolve Drifts.

Fatto quando nessuna scheda né dettaglio di un Drift offre un controllo per decidere o mostra opzioni, nota, Proposal allegata o Where in the code, e l'host rifiuta come sconosciuti i messaggi che lo facevano.
