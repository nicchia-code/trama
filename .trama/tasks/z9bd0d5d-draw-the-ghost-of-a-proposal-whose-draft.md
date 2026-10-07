---
column: done
technical: false
refs:
  - announcement/Writing
  - panel/Board
  - requirements/rules#announcement
  - requirements/ui#drift
  - requirements/ui#panel/Board
drift: null
proposal: 37d8rz9w
agent: false
created: 2026-10-07T17:28:06.544Z
finished: 2026-10-07T17:37:41.717Z
---
# Draw the ghost of a Proposal whose Draft is attached to an open Drift inside that Drift

Un ghost di Proposal la cui Draft è allegata a un Drift aperto non sta in To decide: si disegna nel riquadro `Attached Proposal` di quel Drift, come il ghost di un rifacimento.

Oggi solo gli annunci di rifacimento (quelli che ricordano il loro Drift) escono da To decide. Un annuncio di Proposal fatto dall'agente stesso (per esempio con il launcher della chat, quando la Proposal parte senza annuncio e ne crea uno suo in Writing) resta un ghost in To decide anche dopo che l'agente ha allegato la sua Draft a un Drift aperto, per esempio rifacendo la Proposal obsoleta di quel Drift o archiviando il Drift con quella Draft.

Quando è fatto:
- appena la Draft legata all'annuncio è la Proposal allegata di un Drift aperto, il ghost sparisce da To decide e compare nel riquadro di quel Drift, sulla scheda della Board e nei dettagli del Diagramma, come per un rifacimento (scheletro, titolo della Draft, Keep this sinistro disabilitato come per una Proposal in scrittura);
- prima che la Draft sia allegata, il ghost resta in To decide come oggi;
- consegna e ritiri non cambiano: la consegna della Draft lo consegna, il ritiro (fine del comando, chiusura del terminale, quiete, scarto della Draft, correzione del codice del Drift) lo toglie dal riquadro, che torna a mostrare ciò che mostrava prima;
- il ghost non conta fra ciò che aspetta una decisione.
