---
column: done
technical: false
refs:
  - panel/Board
  - requirements/ui#proposal
  - requirements/ui#panel/Board
  - requirements/ui#panel
  - requirements/tech#proposal
drift: null
proposal: fdvvopzi
agent: false
created: 2026-10-17T19:21:20.471Z
finished: 2026-10-17T19:35:31.693Z
---
# Modale del corpo di una Proposal dalla Board

Nella Board, cliccando una scheda di Backlog di qualunque tipo (ordinaria, di import, di setup o gialla di risoluzione) fuori da pulsanti, ingranaggio, badge, chip, link e righe dei Drift, si apre una finestra modale sopra la Board con il corpo di quella Proposal. Il titolo della scheda è un pulsante raggiungibile da tastiera, con il titolo come nome accessibile, che apre la stessa modale con Invio o spazio; sulla scheda il puntatore è la manina. I controlli già presenti nella scheda fanno solo ciò che facevano.

Quando il lavoro è finito:

- La modale si intitola `<numero breve> <titolo>` (l'identità permanente quando non c'è numero) e mostra il corpo della Proposal, senza front matter e senza H1, reso come Markdown dal renderer del pannello; senza corpo mostra in testo attenuato `This Proposal has no description.`
- È solo da leggere: l'unico controllo è `Close` con l'icona `close`; non ha Approve, Reject, ingranaggio né link al Diagramma, mentre i link http/https nel testo restano utilizzabili.
- Si chiude con `Close`, con Esc e cliccando fuori; all'apertura il focus va a `Close`, resta dentro la modale e alla chiusura torna al titolo della scheda. Ha il ruolo di dialogo modale con il nome del suo titolo e scorre al suo interno con un testo lungo.
- A ogni nuovo quadro il contenuto segue la Proposal senza spostare il focus; la modale si chiude da sola quando la Proposal non è più in Backlog o il pannello si chiude, e il developer torna alla Board dov'era.
- È un `<dialog>` aperto con `showModal()` con un'istanza unica nella Board, come `board/model-dialog.ts` e `board/history-entry.ts`; il testo viene da `ProposalView.body` già nel quadro e da `renderMarkdown`: nessun campo nuovo nel quadro, nessun messaggio nuovo verso l'host, nessuna libreria nuova.
- I testi della modale sono in inglese e non seguono `trama.language`.
