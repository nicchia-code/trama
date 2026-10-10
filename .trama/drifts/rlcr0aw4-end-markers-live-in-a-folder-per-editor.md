---
status: resolved
resolution: proposal
refs:
  - requirements/tech#agent-terminal
  - agent-terminal/Agent running/terminal.COMMAND_ENDED
proposal: null
task: null
origin: null
option: null
note: null
resolvedBy: b4duwb4w
created: 2026-10-09T20:57:42.483Z
---
# End markers live in a folder per editor window, not in external-terminals/ as the Requirement says

## What happens

Ogni finestra dell'editor scrive e osserva i marcatori di fine delle finestre esterne in una **sua sottocartella** di `external-terminals/`, creata con un nome casuale a ogni avvio; lì stanno anche i socket di kitty.

All'avvio la finestra non cancella i marcatori rimasti dalle sessioni chiuse: restano nelle loro sottocartelle e spariscono, senza effetto, solo quando una sottocartella non è toccata da **una settimana**.

## What should happen

Il Requisito dice che il marcatore è un file **nella cartella `external-terminals/`** di `globalStorageUri`, che l'estensione osserva quella cartella e che **all'avvio dell'estensione** i marcatori rimasti si cancellano senza effetto.

La sottocartella per finestra è nata dalla correzione di un Drift precedente (fine della corsa persa con due finestre dell'editor aperte), che metteva in conto di aggiornare il Requisito sul percorso del marcatore; il Requisito però non è cambiato.

## Fix options

### Write the per-window folder into the Requirement

Il Requisito descrive una sottocartella di `external-terminals/` per ogni finestra dell'editor, con i marcatori e i socket di kitty di quella finestra, e la pulizia delle sottocartelle non toccate da una settimana al posto della cancellazione all'avvio. Il codice resta com'è; costa solo una Proposal sul Requisito tecnico.

### Keep the subfolders but clear leftovers at startup

Il codice tiene le sottocartelle per finestra, ma all'avvio cancella subito i marcatori rimasti nelle sottocartelle di sessioni chiuse, lasciando i socket e i marcatori delle finestre ancora vive. Il Requisito va comunque aggiornato sul percorso; serve un modo affidabile per capire quali finestre sono chiuse.

### Go back to the single shared folder

Il codice torna a un'unica cartella `external-terminals/` come dice il Requisito. Riapre il problema già corretto: con due finestre dell'editor aperte una può leggere e cancellare il marcatore dell'altra, che resta in Agent running, e una nuova finestra svuota i socket di kitty delle altre.

## Where in the code

`extension/src/host/external-terminal.ts` (`windowMarkerDir`, costruttore di `ExternalRuns`), `extension/src/host/main.ts` (cartella dei marcatori passata a `watchExternalRuns`)
