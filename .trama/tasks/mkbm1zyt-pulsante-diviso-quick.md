---
column: done
technical: false
refs:
  - panel/Board
  - developer.OPEN_QUICK_TASK
  - requirements/ui#developer.OPEN_QUICK_TASK
  - requirements/ui#panel/Board
  - requirements/ui#panel
drift: null
proposal: ylacwi4x
agent: false
created: 2026-10-22T05:11:42.437Z
finished: 2026-10-22T05:13:06.837Z
---
# Pulsante diviso Add Quick Task

In fondo a Backlog, + Add Work Item diventa un pulsante diviso: la parte principale apre ancora la richiesta di design scritta, con il tooltip e il nome accessibile di sempre; a destra una freccetta a sola icona `ChevronUp`, con tooltip e nome accessibile `More ways to add work`, apre verso l'alto un `DropdownMenu` di shadcn/ui con la sola voce `Add Quick Task` (senza icona, tooltip `Ask an agent for a quick job, without scans or cards`). Il menu si chiude scegliendo la voce, con Esc, con un clic fuori o ripremendo la freccetta, e chiuderlo senza scegliere non fa nulla; il focus torna alla freccetta.

Scegliere la voce è `developer.OPEN_QUICK_TASK` → Board: il webview manda all'host `{ type: "openQuickTask" }`, validato con gli altri messaggi, e la Board non cambia. La freccetta e la voce non sono mai disabilitate: nessun Run, risoluzione, round di domande o scheda che aspetta il suo agente le rende indisponibili, e scan, design, import e Add Quick Task restano avviabili mentre un Run è in corso.

Il componente `DropdownMenu` si copia in `extension/src/webview/ui/` con la dipendenza `@radix-ui/react-dropdown-menu`. Il Requisito `ui#panel/Board` ora rimanda a `ui#developer.OPEN_QUICK_TASK` per il pulsante di Backlog, e la mappa delle icone di `ui#panel` ha la freccetta `ChevronUp`. Cosa fa l'host con il messaggio è nell'altro Task di questa Proposal.
