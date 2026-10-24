---
column: done
technical: false
refs:
  - panel/Board
  - task
  - proposal
  - requirements/ui#task
  - requirements/ui#task/Done
  - requirements/rules#task
drift: null
proposal: srkyrbvl
agent: false
created: 2026-10-24T10:27:31.669Z
finished: 2026-10-24T10:36:07.466Z
---
# Tag solo nei dettagli

Un Task che nasce da una Proposal porta ancora il tag con l'etichetta breve della Proposal (al massimo 30 caratteri; per le Proposal senza etichetta il titolo, accorciato con i puntini oltre i 30 caratteri; tooltip `From Proposal <id>: <titolo>`), ma nessuna scheda della Board lo mostra: né le schede dei Task in `Active` e in `Done`, né le righe dei Task dentro le schede di `Backlog`. I Task della stessa Proposal si riconoscono invece da un sottile bordo sinistro del colore della loro etichetta, lo stesso per la stessa etichetta; un Task che non nasce da una Proposal non ha né tag né bordo colorato. I chip dei riferimenti restano dove sono. La Board continua a non raggruppare i Task (`rules#task`). Lo scope `panel/Board` comprende anche la transizione di Ask more, che realizza il Task `Ask more vuota`, non questo.

Quando è fatto:
- In `extension/src/webview/board/cards.tsx` `TaskCardView` (oggi `TaskProposalTag` attorno alla riga 399) e `DoneCardView` (attorno alla riga 465) non mostrano più il tag; le righe dei Task dentro le schede di Proposal in Backlog non lo mostrano. `TaskProposalTag`/`ProposalTagChip` in `extension/src/webview/board/parts.tsx` restano solo dove servono ancora.
- Le schede dei Task con tag in `Active` e in `Done` hanno un bordo sinistro largo 3 px nel colore di `tagColour` (`extension/src/webview/board/logic.ts`, uno di `blue`, `green`, `amber`, `violet`, `cyan`, `red`, tonalità 600 nel tema chiaro e 400 nello scuro), al posto del bordo sinistro normale; senza tag il bordo è quello normale. Le righe dei Task dentro le schede di Backlog non hanno il bordo colorato (la scheda le raggruppa già). Il bordo convive con il bordo animato del Task preso dall'agente. Questo è il punto di `tech#panel` sul colore del tag che questo Task realizza.
- La scheda di un Task Done (`ui#task/Done`) ha il pallino, il numero breve o l'identità, il titolo, l'ora di fine e il bordo colorato; non mostra tag né chip dei riferimenti. Il clic fuori dai badge, o Invio/Spazio sul titolo, apre i dettagli.
- In `extension/src/webview/board/dialogs.tsx:TaskDetailsDialog` il tag non sta più in testa (oggi attorno alle righe 82-86): dopo chip dei riferimenti, corpo e anteprime, quando il Task ha un tag, c'è un `Button` piccolo `ghost` con icona `Tag` e testo `Show tags`, che apre sotto di sé la riga con il tag (con il suo tooltip) e diventa `Hide tags`, con `aria-expanded`. A ogni apertura della modale la riga è chiusa, anche riaprendo lo stesso Task. Questo interruttore è descritto in `requirements/ui#developer.ASK_MORE`, che appartiene a un altro Task: qui si realizza il solo interruttore.
- I dettagli delle voci di History (`extension/src/webview/board/history.tsx`) mostrano il tag come oggi.
- I test della Board (`test/board-render.test.tsx`) verificano l'assenza del tag sulle schede, il bordo colorato e l'interruttore chiuso a ogni apertura.
