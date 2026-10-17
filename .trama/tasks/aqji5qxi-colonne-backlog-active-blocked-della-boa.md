---
column: done
technical: false
refs:
  - panel/Board
  - panel/Open/developer.SHOW_BOARD
  - requirements/data#task
drift: null
proposal: dk0grfyg
agent: false
created: 2026-10-17T10:26:29.439Z
finished: 2026-10-17T10:53:45.010Z
---
# Colonne Backlog, Active, Blocked e Done della Board

Quando il developer apre la Board (`developer.SHOW_BOARD`, solo in un progetto Trama), la Board ha quattro colonne, `Backlog`, `Active`, `Blocked` e `Done`, calcolate nel webview dal quadro mandato dall'host, dai file già esistenti, senza nuovi campi né stato persistito (salvo la `label` della Proposal):

- `Backlog`: le Proposal aperte (mai Draft) non allegate a un Drift aperto, di ogni tipo, in ordine di creazione; una Proposal di risoluzione consegnata è un'unica scheda gialla con i Drift aperti nominati in `drifts`, che allora non stanno in `Blocked`. Una risoluzione Draft, rifiutata o scartata non toglie nessun Drift da `Blocked`; tornata in scrittura, rifiutata o scartata, i Drift ancora aperti tornano in `Blocked` nell'ordine di creazione. In fondo, anche a colonna vuota, sempre `+ Add Work Item`, unico modo di progettare una modifica dalla Board.
- `Active`: i Task in To do o In progress che nessun Drift aperto blocca e che non aspettano un Task di correzione, più quelli presi dall'agente (`agent` diverso da `false`) anche se bloccati, uno per scheda in ordine di creazione, poi tutti i ghost (anche di Proposal, Drift e controlli: il ghost sta in `Active` qualunque sia la colonna della scheda vera, e la scheda vera arriva nella sua colonna). In fondo sempre `Run all`. Un Task rilasciato dall'agente e bloccato passa in `Blocked`.
- `Blocked`: i Drift aperti fuori da una risoluzione consegnata, ciascuno con i Task che blocca e che l'agente non ha preso (un Task bloccato da più Drift sta sotto ciascuno), e una scheda di attesa per ogni Task di correzione (un Task con `drift`) che almeno un Task non Done aspetta, al posto del suo Task di correzione nell'ordine di creazione; il Task di correzione resta in `Active`. In fondo sempre `Resolve all`, che chiede di risolvere insieme tutti i Drift aperti. Un Drift risolto in qualunque modo sparisce e i suoi Task tornano in `Active` o nella scheda di attesa del Task di correzione che ora aspettano.
- `Done`: i Task finiti, una scheda per Task con il suo tag, raggruppati per giorno, col filtro del periodo e la colonna collassabile come prima; la data di fine è il `finished` del Task.

Il tag di un Task è la `label` della Proposal nominata nel suo `proposal`, o il titolo di quella Proposal quando non ha `label`; senza `proposal` o con una Proposal che non esiste più, nessun tag.

La barra in alto ha soltanto `Scan System` col numero di Task finiti dall'ultimo scan globale. Il numero sulla tab Board è la somma delle schede di `Backlog` e delle schede dei Drift di `Blocked` (una risoluzione conta una volta, schede di attesa e ghost non contano); il numero di ogni colonna conta le sue schede vere, in `Blocked` anche quelle di attesa, mai i ghost. La lista completa dei Drift nella Snapshot resta invariata per Diagramma, blocchi e riga di comando.

Le azioni sulla Board restano solo guardare, seguire i link, aprire i dettagli di un Task, aprire e chiudere Done e sceglierne il periodo, chiudere avvisi, approvare o rifiutare, scrivere una richiesta di design, lanciare un Run (un Task o `Run all`), chiedere di risolvere un Drift o tutti e `Dismiss Drift`; nessun movimento di schede.

Cutover pulito: togliere dal webview le colonne `Work Items`, `Ready` e `In progress` e il loro calcolo, le schede di design e il raggruppamento dei Task per Proposal, i pulsanti della barra `Run Ready Tasks`, `Resolve Drifts`, `Quick request…` e `Add Work Item…`. Aggiornare i test del calcolo delle colonne e dei conteggi.
