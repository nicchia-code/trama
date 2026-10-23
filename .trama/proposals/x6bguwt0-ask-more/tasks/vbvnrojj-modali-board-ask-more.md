---
technical: false
refs:
  - panel/Board
  - panel/Open/developer.SHOW_BOARD
  - requirements/ui#developer.ASK_MORE
  - requirements/ui#panel/Board
  - requirements/ui#panel
  - requirements/ui#proposal
  - requirements/ui#task
  - requirements/ui#drift
  - requirements/tech#proposal
---
# Modali della Board con Ask more

Quando questo Task è finito, sulla Board ogni Proposal, Task e Drift ha una modale di dettagli con `Ask more`, e le schede Task e Drift non hanno più il toggle `Show details`. Il messaggio `askMore` e il lancio della chat stanno nel Task «Lancio di Ask more» della stessa Proposal; questo Task costruisce le modali e manda il messaggio.

Cosa deve valere (`panel/Board`):
- Clic su una scheda Task in `Active` o su una scheda rossa di Drift in `Backlog`, fuori da pulsanti, badge e loro popup, tag, chip e link (o Invio/spazio sul titolo, che diventa un pulsante da tastiera), apre la modale dei dettagli; puntatore a manina. Il toggle `Show details`/`Hide details` sparisce da quelle schede; resta solo nella sezione `Tasks` dei dettagli di una Proposal nel Diagramma.
- Modale del Task: titolo `<numero breve> <titolo>`, tag della Proposal, chip dei riferimenti (stessi collegamenti di prima), corpo Markdown o `This Task has no description.`, anteprime delle immagini. Modale del Drift: titolo con i badge, chip dei riferimenti, i due lati `What happens` / `What should happen`, riga `Not blocking`, Drift uniti per un Drift unificato.
- Entrambe sono da leggere: nessun Run, View on diagram, View requirements, Open, Resolve o Dismiss Drift, che restano sulla scheda. Piede a destra: `Ask more` e poi `Close`. La modale del corpo della Proposal riceve lo stesso piede (`ui#proposal`: i soli controlli sono `Ask more` e `Close`).
- Chiusura, focus e ruolo come la modale del corpo della Proposal; il contenuto segue il quadro; la modale del Task si chiude quando il Task lascia `Active`, quella del Drift quando lascia `Backlog`, entrambe alla chiusura del pannello.
- `Ask more`: `Button` shadcn/ui `outline` con icona `MessageCircleQuestion`, tooltip `Ask an agent about this Task` / `Proposal` / `Drift`, nome accessibile `Ask more about <numero breve>`, sempre abilitato; manda `{ type: "askMore", kind, id }` con l'identità permanente e lascia la modale aperta.
- Testi in inglese, che non seguono `trama.language`. Aggiornare i test del webview che oggi usano `Show details` su Task e Drift.

Test come in `tech#developer.ASK_MORE` (clic e tastiera aprono la modale giusta, niente `Show details`, solo `Ask more` e `Close`, messaggio inviato).
