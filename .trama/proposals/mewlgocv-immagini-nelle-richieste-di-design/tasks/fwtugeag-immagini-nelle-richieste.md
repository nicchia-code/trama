---
technical: false
refs:
  - design-request
  - requirements/data#design-request
  - requirements/rules#design-request
  - requirements/tech#design-request
  - requirements/ui#design-request
---
# Immagini nelle richieste di design e di setup

Quando il Task è finito, il developer può mettere immagini in una richiesta scritta, di design o di setup, con CTRL+V o Drag&Drop nella scheda della richiesta, e le immagini restano solo contesto per l'agente che scrive la Proposal.

- Incollare o trascinare un'immagine che viene da fuori dal progetto la copia nella cartella delle immagini della richiesta, `requests/<id>.images/`, e scrive nel testo il collegamento relativo; un'immagine che sta già nel progetto è solo collegata e non è mai cancellata con la richiesta. Lo fa l'editor Markdown integrato grazie al default di `markdown.copyFiles.destination` contribuito dall'estensione, senza provider propri e senza alzare `engines.vscode`.
- La cartella delle immagini non è mai una richiesta e non entra negli elenchi dell'estensione; il `.gitignore` di `requests/` la ignora già.
- Il titolo salta le righe-immagine; senza nessun'altra riga il titolo è l'ID della richiesta. Una richiesta fatta solo di immagini non è vuota e parte.
- In Writing, `developer.CLOSE_REQUEST` → Abandoned con il testo vuoto cancella il file e la cartella delle immagini, se c'è, senza inviare nulla. `workspace.REQUEST_DELETED`, sia da Writing verso Abandoned sia da Sent verso Consumed, cancella la cartella delle immagini, se c'è, e chiude la scheda alle condizioni di oggi.
- In Sent, `proposal.SUBMITTED` → Consumed per la Proposal legata: `trama proposal submit` cancella il file della richiesta e la cartella delle sue immagini e non fallisce se uno dei due è già sparito. Una consegna rifiutata non cancella nulla. Una richiesta inviata e mai consumata tiene la sua cartella finché esiste il file.
- All'attivazione sul progetto l'estensione cancella ogni cartella delle immagini senza il suo file di richiesta.
- Il testo fantasma delle due richieste aggiunge la frase «Paste or drop images for context.» come scritto in `ui#design-request`.
- Le skill `trama-design` e `trama-setup` (in `skills/`) dicono di guardare le immagini che la richiesta collega (file locali e indirizzi web, quando l'agente può), di ignorare in silenzio quelle che non si vedono, di scrivere a parole ciò che conta e di non copiare, collegare o citare mai le immagini della richiesta nella Proposal, nel Modello, nei Requisiti, nelle Specs o nei Task. L'istruzione di una riga all'agente non cambia e nessuna validazione nuova controlla le immagini.
