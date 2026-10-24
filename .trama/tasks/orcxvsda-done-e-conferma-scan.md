---
column: done
technical: false
refs:
  - panel
  - agent-launching
  - developer.FOCUS_REF
  - requirements/ui#task/Done
  - requirements/ui#panel
drift: null
proposal: caa5tuxr
agent: false
created: 2026-10-23T20:44:38.560Z
finished: 2026-10-23T20:50:50.577Z
---
# Done senza chip e conferma scan

Due cambiamenti nel pannello di Trama.

**Schede Done senza chip dei riferimenti.** La scheda di un Task nella colonna Done ha, in testa, pallino, numero breve o identità, titolo, tag della Proposal e ora di fine, più i badge `unchanged` e `kept` quando valgono; non ha più la riga dei chip dei riferimenti (elementi del Modello, sezioni dei Requisiti, campi delle Specs). Il tag della Proposal resta. I chip restano nella finestra dei dettagli del Task, la stessa per Active e Done, con gli stessi collegamenti e tooltip, e restano sulle schede dei Task in Active, dei Drift e nei dettagli delle voci di History. Cliccare la scheda Done fuori dal tag e dai badge, o premere Invio o Spazio sul titolo, apre i dettagli del Task come prima. Codice noto: `DoneCardView` in `extension/src/webview/board/cards.tsx` (riga `RefChips` e commento del componente); il test `test/board-render.test.tsx` che si aspetta il chip `order/Paid` su una scheda Done va aggiornato.

**Conferma dello scan di tutto il Sistema dal Diagramma e dal comando.** Prima di lanciare uno scan di tutto il Sistema da `Scan` nella barra del Diagramma quando scansiona tutto (alla radice, a Whole System e al livello di un Actor) o dal comando `Trama: Scan System` con la scelta `Whole System`, l'host apre un dialogo modale dell'editor (`vscode.window.showWarningMessage` con `modal: true`): «Scan the whole System?», dettaglio «The agent compares every Machine with the code: this can take a long time.», pulsante `Scan`. Solo con `Scan` lo scan parte come oggi; `Cancel`, Esc o la chiusura del dialogo non fanno nulla: nessuno scan, nessun ricordo dello scan, il numero `· N` resta. Lo scan di una Feature, dal Diagramma o dal comando, parte senza dialogo. Testi in inglese, non seguono `trama.language`. Lo stesso dialogo lo usa `Scan System` del menu laterale (un altro Task): se esiste già una funzione condivisa dell'host per questo dialogo, usarla; altrimenti crearla in modo che il menu la possa usare.

Il resto del pannello non cambia. In `ui#panel` l'icona dei pulsanti resta a sinistra del testo, che non sparisce mai, salvo la modalità solo icone del menu laterale, che appartiene all'altro Task.
