---
technical: false
refs:
  - design-request/Consumed
  - design-request/Sent/proposal.SUBMITTED
  - design-request/Sent/workspace.REQUEST_DELETED
  - requirements/tech#design-request
---
# Immagini dei Task in core

Quando il Task è fatto, `src/core` e la riga di comando gestiscono le immagini che un Task porta per chi lo realizza, con il formato di `requirements/data#task`: le copie stanno in `.trama/task-images/<identità del Task>/`, non versionate (un `.gitignore` con `*` in `.trama/task-images/`, scritto con la prima immagine), con il nome del file originale e un suffisso `-2`, `-3`, … prima dell'estensione per un nome già presente; ordine per data di modifica, poi nome.

`trama proposal edit <id>` accetta `images`, un elenco di `{ task, path }`: `task` è il nome completo di un Task della Proposal (`tasks/<identità>-<slug>.md`) o la sua identità, `path` un file locale assoluto o relativo alla radice del progetto con estensione `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp` o `.svg`. Il file è copiato (l'originale non cambia) e il comando stampa il percorso della copia. `removeImages`, un elenco di `{ task, name }`, toglie copie. Un Task che non è della Proposal, un file che non esiste o un'estensione diversa sono rifiutati senza cambiare nulla, con un'uscita di errore che dice perché. Come ogni comando che cambia una Proposal, riporta a Draft una Proposal aperta.

`trama task show <id>` stampa il blocco `Images` con i percorsi assoluti e, con `--json`, il campo `images` (lista dei percorsi assoluti, vuota senza immagini); `trama proposal show --json` aggiunge `images` (i nomi dei file) a ogni Task.

Tutte le cancellazioni stanno in una sola funzione di `src/core` che, data la lista delle schede, cancella le cartelle delle immagini dei Task che non devono più tenerle. Un Task tiene le sue immagini finché è in una Proposal `draft` o `open`, oppure è in To do o In progress, oppure è in una Proposal rifiutata con Rework with feedback (`reworkRequested: true`) la cui Proposal nuova, con `reworks` uguale al suo id, non è ancora stata consegnata. La funzione è chiamata da `trama task move <id> done` (anche con `unchanged`), dal rifiuto, dallo scarto, dalla consegna (`trama proposal move <id> open`) di una Proposal con `reworks`, dalla rimozione di un Task da una Proposal e dall'estensione all'attivazione sul progetto (in `extension/src/host`), insieme alla pulizia delle cartelle `requests/<id>.images/` senza il loro `requests/<id>.md`. Una cartella già sparita non fa fallire nulla.

La richiesta continua a sparire come prima: la consegna riuscita della Proposal legata cancella `.trama/requests/<id>.md` e `.trama/requests/<id>.images/` (`consumeRequest` in `src/core/design-requests.ts`), e la cancellazione del file da fuori fa cancellare all'estensione la cartella delle immagini e chiudere la scheda se non ha modifiche non salvate. Le copie legate ai Task restano invece con i Task: la Proposal nata dalla richiesta non contiene né collega le immagini della richiesta, ma i suoi Task conservano le loro copie in `.trama/task-images/`.

Codice coinvolto: `src/core/proposals.ts` (edit, show, move a rejected/discarded/open), `src/core/design-requests.ts`, il codice di `trama task move`/`task show` in `src/core` e nella CLI, l'attivazione dell'estensione in `extension/src/host`. Le anteprime nel webview sono fuori da questo Task.
