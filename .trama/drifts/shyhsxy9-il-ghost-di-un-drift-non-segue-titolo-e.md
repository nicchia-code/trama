---
status: resolved
resolution: fix-code
refs:
  - panel/Board
  - requirements/ui#panel/Board
proposal: null
task: a13ko24b
origin: null
option: 1
note: null
resolvedBy: 5mztm9sl
created: 2026-10-10T12:48:56.370Z
---
# Il ghost di un Drift non segue titolo e fase della Draft

## What happens

Quando l'agente lega una Draft all'annuncio di un Drift, il ghost nella Board continua a mostrare **il titolo annunciato del Drift**, anche se il titolo della Draft è diverso o cambia durante la scrittura. La riga di fase diventa **Writing the Proposal**. Questa resa vale anche mentre la Board è nascosta; tornando alla Board non compare il titolo corrente della Draft.

## What should happen

Per una scheda annunciata, anche un Drift, il ghost deve seguire da solo il titolo corrente della Draft quando questa esiste. La riga di fase richiesta è **Writing** dopo la creazione della Draft, **Preparing** prima e **Waiting for your answers** durante un round di domande. Gli aggiornamenti devono avvenire senza intervento del developer, anche quando è visibile un'altra scheda del pannello.

## Fix options

### Ricavare il titolo corrente a ogni quadro

La Board riceve per ogni ghost legato a una Draft il titolo corrente di quella Draft, senza distinguere Proposal e Drift. Usa Writing per entrambi e mantiene la precedenza del round di domande. Il titolo inizialmente annunciato può restare conservato separatamente dalla resa; il costo è allineare la preparazione del quadro e la sua visualizzazione alla stessa regola.

### Sincronizzare il titolo dell'annuncio con la Draft

Il titolo del ghost viene allineato alla Draft quando nasce e a ogni successiva modifica, anche per gli annunci di Drift. La Board mostra il titolo così aggiornato e la fase Writing, oppure Waiting for your answers quando serve. Questo mantiene uniforme la resa nelle diverse letture dell'annuncio; il costo è estendere la sincronizzazione già prevista senza perdere la consegna della card.

## Where in the code

src/core/announcements.ts: bindDraft conserva il titolo del Drift; src/core/snapshot.ts: announcementView sostituisce il titolo solo per kind proposal; extension/src/host/announcements.ts: synchronizeTitles esclude i Drift; extension/src/webview/board/logic.ts: announcedPhase mostra "Writing the Proposal" per i Drift.
