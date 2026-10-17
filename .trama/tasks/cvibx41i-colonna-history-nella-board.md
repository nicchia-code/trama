---
column: done
technical: false
refs:
  - panel/Board
  - panel/Open/developer.SHOW_BOARD
  - requirements/ui#panel/Board
drift: null
proposal: uvn8ulmq
agent: false
created: 2026-10-17T10:26:31.354Z
finished: 2026-10-17T11:19:39.119Z
---
# Colonna History al posto di Done nella Board

Quando il Task è finito, la Board ha le colonne `Backlog`, `Active`, `Blocked` e `History`, in quest'ordine, e la colonna Done non esiste più. I Task Done non stanno in nessuna colonna: si vedono solo dentro le voci di History che li raccontano. La scheda di attesa porta alla scheda del Task di correzione solo in `Active`; la scheda di un Task con "Show details" esiste solo in `Active`.

La colonna History mostra le voci di History (Voce di History), ognuna con titolo, data e riassunto, in ordine inverso di data: la data è l'ultima volta che l'agente ha scritto o aggiornato la voce (`updated`); a parità di istante decide l'ordine di creazione inverso. Le voci sono raggruppate per giorno locale con intestazioni `Today · N`, `Yesterday · N`, poi la data per esteso nella lingua dell'editor; i gruppi vuoti non compaiono. In cima, un menu a tendina con etichetta accessibile «History period» sceglie `Today`, `Last 7 days` (iniziale), `Last 30 days` o `All`; una voce entra nel periodo se la sua data ci cade; la scelta resta mentre la Board si aggiorna e si dimentica alla chiusura del pannello. Il numero accanto al titolo conta le voci visibili nel periodo; senza voci la colonna dice `Nothing done in this period`. History non ha pulsanti in fondo e le sue voci non si decidono né si avviano.

Ogni voce ha una «i» che apre i dettagli (testo completo e Task citati con il loro stato); chiudendoli il developer torna alla Board dov'era. La colonna è collassabile con la chevron nell'intestazione: tooltip e nome accessibile `Collapse History column` / `Expand History column`, stato aperto/chiuso comunicato alle tecnologie assistive; collassata è una striscia stretta con il pulsante e il titolo `History` in verticale, senza voci, menu, numero né testo vuoto, e Backlog, Active e Blocked si dividono lo spazio. È collassata quando la Board si mostra la prima volta dopo l'apertura del pannello e la scelta resta durante la sessione.

Il numero sulla tab Board (mostrata da developer.SHOW_BOARD) resta la somma delle schede di `Backlog` e dei Drift in `Blocked`: le voci di History non contano mai. Fra le azioni ammesse sulla Board ci sono aprire e chiudere la colonna History, sceglierne il periodo e aprire e chiudere i dettagli di una voce; nient'altro.

Cutover pulito: togliere dal webview la colonna Done, il filtro «Done period», i gruppi per `finished` e il gruppo `No date`, le etichette `Collapse/Expand Done column` e ogni stato legato a Done; aggiornare i test della Board di conseguenza.
