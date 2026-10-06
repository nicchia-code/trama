---
column: done
technical: false
refs:
  - panel/Board
  - panel/Open/developer.SHOW_BOARD
  - requirements/ui#panel/Board
drift: null
proposal: 94bb2yjg
agent: false
created: 2026-10-06T12:17:26.011Z
---
# Ordinare la colonna Done della Board per data di fine, a gruppi per giorno, con il filtro del periodo

Nella Board del pannello la colonna Done mostra prima la scheda finita più di recente: la data di un Task è il suo `finished`, quella di una scheda di design il `finished` più recente fra i suoi Task; a parità decide l'ordine di creazione inverso, e dentro la scheda di design i Task restano in ordine di creazione. Le schede sono raggruppate per giorno di fine nell'ora locale, con intestazioni `Today · N`, `Yesterday · N` o la data per esteso nella lingua dell'editor; nessun gruppo vuoto. In cima alla colonna un menu, con etichetta accessibile «Done period», sceglie `Today`, `Last 7 days` (iniziale), `Last 30 days` o `All`; la scelta resta mentre la Board si aggiorna e si dimentica alla chiusura del pannello. Le schede senza data di fine stanno in un ultimo gruppo `No date`, visibile solo con `All`. Il numero della colonna conta le schede visibili; se il periodo non ne lascia nessuna la colonna dice `Nothing done in this period`. Le altre colonne e la riga di comando non cambiano.
