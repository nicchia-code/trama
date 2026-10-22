# Requirements: Interfaccia, Quick Task interface

Usa quando costruisci o cambi il pulsante diviso + Add Work Item, il suo menu Add Quick Task e ciò che il Quick Task mostra.

## developer.OPEN_QUICK_TASK

- In fondo a `Backlog` c'è un pulsante diviso, largo quanto la colonna, fatto di due `Button` di shadcn/ui uniti, entrambi nella variante `outline` con bordo tratteggiato: a sinistra, quasi tutta la larghezza, `+ Add Work Item` con l'icona `Plus`; a destra, stretta, la freccetta a sola icona `ChevronUp`.
- `+ Add Work Item` apre una nuova richiesta di design scritta (vedi `design-request`); il tooltip è `Write a work item in Markdown and send it to an agent` e il nome accessibile `Add Work Item`.
- La freccetta ha tooltip e nome accessibile `More ways to add work` e dice alle tecnologie assistive se il menu è aperto.
- La freccetta, con il clic o da tastiera come ogni `DropdownMenu`, apre un `DropdownMenu` di shadcn/ui sopra il pulsante (`side="top"`). Il menu ha una sola voce, `Add Quick Task`, senza icona, con tooltip `Ask an agent for a quick job, without scans or cards`. Il menu non ripete `+ Add Work Item`.
- Scegliere la voce chiude il menu. Esc, un clic fuori o un nuovo clic sulla freccetta chiudono il menu senza fare nulla, e il focus torna alla freccetta.
- La freccetta e la voce sono sempre abilitate: nessun Run, risoluzione, round di domande o scheda che aspetta il suo agente le disabilita, come `+ Add Work Item`.
- Scegliere `Add Quick Task` non mostra nessun campo, nessuna casella e nessuna conferma: apre subito la chat, che prende il focus. Con omp il terminale, nell'area dei terminali o nella scheda dell'editor secondo `trama.terminalLocation`, si chiama `Quick` e diventa il terminale visibile con il cursore dentro. Con la chat di Cursor si apre una conversazione nuova, vuota, con il cursore nel campo del messaggio.
- Con omp, `System Activities` mostra il ghost di lavoro `Quick`, con l'aspetto del ghost di un import (vedi `ui#announcement`), finché il terminale non si chiude o omp non esce; sparisce senza avvisi. Con la chat di Cursor non c'è nessun ghost.
- Con la chat di Cursor in un editor che non è Cursor compare un messaggio informativo con un pulsante: `Trama: Cursor's chat is only available in Cursor. Choose omp in Trama's Settings to open a Quick Task in a terminal.`, con il pulsante `Open Settings`, che apre il pannello di Trama sulla scheda Settings. Non si apre nulla e gli appunti non cambiano.
- Se Cursor non riesce ad aprire una conversazione nuova compare il messaggio d'errore `Trama: could not open a new Cursor chat.`, senza pulsanti. Non si apre nulla, non c'è ghost e gli appunti non cambiano.
- Tutti questi testi sono in inglese e non seguono `trama.language`.
