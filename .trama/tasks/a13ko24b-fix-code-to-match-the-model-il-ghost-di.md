---
column: done
technical: false
refs:
  - panel/Board
  - requirements/ui#panel/Board
drift: shyhsxy9
proposal: null
agent: false
created: 2026-10-10T14:15:26.807Z
finished: 2026-10-10T15:19:48.895Z
---
# Fix code to match the Model: Il ghost di un Drift non segue titolo e fase della Draft

## What happens

Quando l'agente lega una Draft all'annuncio di un Drift, il ghost nella Board continua a mostrare **il titolo annunciato del Drift**, anche se il titolo della Draft è diverso o cambia durante la scrittura. La riga di fase diventa **Writing the Proposal**. Questa resa vale anche mentre la Board è nascosta; tornando alla Board non compare il titolo corrente della Draft.

## What should happen

Per una scheda annunciata, anche un Drift, il ghost deve seguire da solo il titolo corrente della Draft quando questa esiste. La riga di fase richiesta è **Writing** dopo la creazione della Draft, **Preparing** prima e **Waiting for your answers** durante un round di domande. Gli aggiornamenti devono avvenire senza intervento del developer, anche quando è visibile un'altra scheda del pannello.

## Chosen option

**Ricavare il titolo corrente a ogni quadro**

La Board riceve per ogni ghost legato a una Draft il titolo corrente di quella Draft, senza distinguere Proposal e Drift. Usa Writing per entrambi e mantiene la precedenza del round di domande. Il titolo inizialmente annunciato può restare conservato separatamente dalla resa; il costo è allineare la preparazione del quadro e la sua visualizzazione alla stessa regola.

## Where in the code

src/core/announcements.ts: bindDraft conserva il titolo del Drift; src/core/snapshot.ts: announcementView sostituisce il titolo solo per kind proposal; extension/src/host/announcements.ts: synchronizeTitles esclude i Drift; extension/src/webview/board/logic.ts: announcedPhase mostra "Writing the Proposal" per i Drift.
