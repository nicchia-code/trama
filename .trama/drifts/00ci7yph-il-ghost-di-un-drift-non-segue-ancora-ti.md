---
status: resolved
resolution: dismissed
refs:
  - panel/Board
proposal: null
task: null
origin: null
previous: shyhsxy9
critical: false
option: null
note: null
created: 2026-10-16T13:28:47.858Z
---
# Il ghost di un Drift non segue ancora titolo e fase della Draft

## What happens

Quando l'agente lega una Draft all'annuncio di un Drift, il ghost del Drift nella Board continua a mostrare il titolo con cui era stato annunciato, anche se la Draft ha un titolo diverso o lo cambia mentre la scrive. La riga di fase dice **Writing the Proposal** invece di **Writing**.

## What should happen

Per ogni scheda annunciata, anche un Drift, il Modello e il Requisito della Board dicono che il ghost segue da solo il **titolo corrente della Draft** quando la Draft esiste. La fase è **Preparing** prima della Draft, **Writing** dopo la sua creazione, **Waiting for your answers** durante un round di domande. Il Drift precedente su questo punto è stato risolto cambiando il codice, ma la differenza è tornata: il codice non fa più quello che il Drift risolto chiedeva.

## Fix options

### Usare titolo e fase della Draft anche per i Drift (consigliata)

Il ghost di un Drift legato a una Draft mostra il titolo corrente della Draft e la fase **Writing** dopo la sua creazione, come fa già per una Proposal. Il titolo annunciato del Drift resta nel suo annuncio. Costo: durante la scrittura la Board non mostra più il titolo scelto per il Drift, e la fase «Writing the Proposal» sparisce dalla Board.

### Allineare il titolo dell'annuncio del Drift alla Draft

Quando la Draft nasce e a ogni sua modifica, il titolo dell'annuncio del Drift prende quello della Draft, e la fase diventa **Writing**. La Board resta com'è e mostra un solo titolo per ogni annuncio. Costo: il titolo originale del Drift si perde nell'annuncio, e la sincronizzazione dei titoli, oggi solo per le Proposal, va estesa anche ai Drift.

## Where in the code

extension/src/webview/board/logic.ts, funzione announcedPhase: per un annuncio di Drift con Draft la fase è «Writing the Proposal»; src/core/snapshot.ts, funzione announcementView: il titolo della Draft sostituisce quello annunciato solo per il kind proposal; extension/src/host/announcements.ts, funzione synchronizeAnnouncementTitles: esce subito se il kind non è proposal.
