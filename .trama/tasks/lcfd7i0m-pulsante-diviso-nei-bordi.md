---
column: done
technical: false
refs:
  - developer.OPEN_QUICK_TASK
  - developer.REWORK_PROPOSAL
  - developer.REWORK_DRIFT
  - requirements/ui#developer.OPEN_QUICK_TASK
  - requirements/ui#developer.REWORK_PROPOSAL
  - requirements/tech#developer.OPEN_QUICK_TASK
  - requirements/tech#developer.REWORK_PROPOSAL
drift: null
proposal: grk8iaio
agent: false
created: 2026-10-22T06:15:12.985Z
finished: 2026-10-22T06:18:18.449Z
---
# Pulsante diviso nei bordi

Il pulsante diviso `+ Add Work Item` in fondo alla colonna `Backlog` della Board oggi esce dalla colonna: la parte principale prende il 100% della riga (`w-full` del `BoardButton` con `full`, più `shrink-0` della base di `Button`) e la freccetta `ChevronUp` viene aggiunta dopo, oltre il bordo destro della colonna, sopra lo spazio fra le colonne, fino a toccare `Active`. Inoltre `+ Add Work Item` è una copia scritta a parte nel piede di `Backlog` (`extension/src/webview/board/index.tsx`), mentre `Reject` e `Dismiss Drift` usano il componente condiviso `extension/src/webview/split-button.tsx`.

Quando il Task è finito deve valere:

- Esiste un solo componente del webview per i pulsanti divisi, `extension/src/webview/split-button.tsx`, usato da `+ Add Work Item` nel piede di `Backlog` e da `Reject` e `Dismiss Drift` sulle schede della Board e nei dettagli del Diagramma. Il piede di `Backlog` non ha più una copia scritta a mano. Chi usa il componente sceglie la parte principale (testo, icona, variante, stato e motivi di disabilitazione), il bordo tratteggiato, l'icona della freccetta (`ChevronDown` per `Reject` e `Dismiss Drift`, `ChevronUp` per `+ Add Work Item`), il lato del menu (`side="bottom"` per `Reject` e `Dismiss Drift`, `side="top"` per `+ Add Work Item`), tooltip e nome accessibile della freccetta e le voci del menu. Senza librerie nuove: due `Button` di shadcn/ui uniti e il `DropdownMenu` di `extension/src/webview/ui/dropdown-menu.tsx`.
- Il componente ha una modalità a tutta larghezza, usata da `+ Add Work Item`: il contenitore occupa la larghezza del suo genitore e la parte principale prende solo lo spazio che la freccetta lascia (cresce e si restringe, con larghezza minima zero), mai il 100% della riga; la freccetta non si restringe. Senza quella modalità il pulsante diviso è largo quanto il suo contenuto e non si spezza fra due righe. Un pulsante disabilitato avvolto per il tooltip segue le stesse regole di larghezza.
- `+ Add Work Item`, freccetta compresa, sta tutto dentro la colonna `Backlog`: il suo bordo sinistro e il suo bordo destro coincidono con quelli delle schede di `Backlog` (e di `Run all` in `Active`). La freccetta non va mai oltre il bordo della colonna, né sopra lo spazio fra le colonne o sopra la colonna accanto. Resta tutto il resto di `+ Add Work Item`: variante `outline` con bordo tratteggiato per entrambe le parti, icona `Plus`, tooltip `Write a work item in Markdown and send it to an agent`, nome accessibile `Add Work Item`, messaggio `writeDesignRequest`; la freccetta con tooltip e nome accessibile `More ways to add work`, il menu sopra il pulsante con la sola voce `Add Quick Task` che manda `openQuickTask`, sempre abilitati.
- `Reject` e `Dismiss Drift`, freccetta compresa, stanno sempre tutti dentro la scheda della Board o i dettagli del Diagramma che li contengono: non vanno mai oltre i loro bordi, e la freccetta resta sempre unita alla parte principale, sulla stessa riga, anche quando i pulsanti accanto vanno a capo. Testi, icone, menu `Rework with feedback…`, disabilitazioni e motivi restano quelli di oggi.
- Nessuna regola nuova per il testo quando lo spazio non basta: la colonna non scende sotto la sua larghezza minima e valgono le regole di `ui#panel` (il testo non sparisce mai).

La verifica si fa anche nel pannello reale: il piede di `Backlog` allineato alle schede e a `Run all`, senza nulla oltre il bordo destro della colonna, e `Reject` e `Dismiss Drift` immutati sulle schede e nel Diagramma. L'immagine allegata mostra il difetto com'è oggi.
