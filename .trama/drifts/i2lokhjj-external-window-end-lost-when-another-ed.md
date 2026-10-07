---
status: resolved
resolution: fix-code
refs:
  - agent-terminal/Agent running/terminal.COMMAND_ENDED
  - requirements/tech#agent-terminal
proposal: null
task: s76195l0
origin: null
option: 1
note: null
created: 2026-10-07T18:01:59.612Z
---
# External window end lost when another editor window is open

## What happens

La cartella dei marcatori di fine è **condivisa da tutte le finestre dell'editor** aperte (anche su progetti diversi), e ogni finestra cancella i marcatori che trova, anche quelli di corse che non ha avviato:

- con due finestre dell'editor aperte, la fine del comando di una finestra esterna può essere letta e cancellata dall'altra finestra prima che quella giusta la veda: l'agente resta **Agent running** per sempre, i Task presi non tornano in To do e la finestra non si riusa più;
- aprire una nuova finestra dell'editor svuota tutta la cartella, compresi i socket delle finestre kitty aperte dalle altre: il riuso successivo fallisce e si apre una finestra nuova con l'avviso.

## What should happen

La fine del comando scritto da Trama in una finestra esterna arriva sempre a questa Machine (**Agent running → Agent idle**), e una finestra kitty libera si riusa quando le condizioni dei Requisiti ci sono.

I Requisiti dicono di cancellare senza effetto solo i marcatori di corse vecchie o di terminali che Trama non segue più, e all'avvio solo i marcatori rimasti: non i marcatori di corse in corso in un'altra finestra dell'editor, né i socket di kitty.

## Fix options

### One marker folder per editor window

Ogni finestra dell'editor usa una sua sottocartella di `external-terminals/` e all'avvio pulisce solo la propria, più le sottocartelle di sessioni chiuse da tempo. Nessuna finestra tocca i marcatori o i socket di un'altra. Costa una piccola modifica al Requisito sul percorso del marcatore e la pulizia delle sottocartelle orfane.

### Touch only own terminals' files

Cartella unica, ma una finestra legge e cancella solo i marcatori dei terminali che ha avviato lei; all'avvio cancella solo i marcatori (mai i socket) più vecchi di un limite. Nessun cambio al percorso; i marcatori di finestre chiuse restano finché non scadono, e il Requisito va precisato su cosa vuol dire «non seguito».

### Accept one editor window

Si lascia il codice com'è e si scrive nei Requisiti che con «external-terminal» la fine della corsa e il riuso di kitty sono garantiti solo con una finestra dell'editor aperta. Non costa codice, ma con più finestre aperte l'agente può restare in corsa per sempre e i Task presi restano presi finché il developer non li riprende.

## Where in the code

`extension/src/host/external-terminal.ts` (`ExternalRuns`: il costruttore e `take`), `extension/src/host/main.ts` (cartella in `globalStorageUri`), `extension/src/host/agent.ts` (socket di kitty in `externalDir`)
