---
column: done
technical: false
refs:
  - panel
  - focus
  - editor-panel
  - developer.OPEN_PANEL
  - developer.SHOW_BOARD
  - developer.SHOW_DIAGRAM
  - developer.SHOW_REQUIREMENTS
  - developer.SHOW_SPECS
  - developer.SHOW_HISTORY
  - developer.SHOW_SETTINGS
  - developer.FOCUS_REF
  - requirements/ui#General
  - requirements/ui#panel
  - requirements/tech#panel
  - requirements/ui#panel/Board
  - requirements/ui#panel/History
  - requirements/ui#task/Done
  - requirements/ui#developer.CLEAR_DONE
  - requirements/ui#panel/Get Started
  - requirements/ui#panel/Diagram
  - requirements/ui#panel/Settings
  - requirements/tech#panel/Settings
  - requirements/ui#focus
  - requirements/ui#developer.ASK_MORE
  - requirements/ui#announcement
  - requirements/tech#announcement
  - requirements/ui#proposal
  - requirements/ui#task
drift: null
proposal: 63ymkrdw
agent: false
created: 2026-10-23T19:14:38.307Z
finished: 2026-10-23T19:38:33.719Z
---
# Pannello senza schede

Il pannello di Trama (webview in `extension/src/webview/`) perde la barra delle schede e diventa un contenitore di sei viste che il developer sceglie dal menu laterale di Trama (realizzato a parte: webview view della barra laterale, comandi della palette `trama.show*`, badge e `Scan System`), dai collegamenti interni e dai comandi Show Board, Show Diagram, Show Requirements, Show Specs, Show History e Show Settings. Il titolo della scheda dell'editor resta il nome del Sistema (nome della cartella con Modello vuoto o senza progetto).

## Viste e navigazione
- In `extension/src/webview/shell.tsx` sparisce la barra `Tabs` (`TABS`, `TabsList`) e la rotella `Settings` all'estremità destra; con lei sparisce il numero sulla tab Board. Gli avvisi di errore del quadro, il banner delle diagnostiche e la barra ridotta delle domande restano in cima al pannello, sopra la vista. Nella lista dei componenti shadcn/ui di `ui#General` non c'è più `Tabs`.
- Le viste (`ViewName` in `extension/src/protocol.ts`) sono `board`, `diagram`, `requirements`, `specs`, `history`, `settings` e `getstarted`. Senza progetto Trama esistono solo `getstarted` e `settings`: Board, Diagram, Requirements, Specs e History non si mostrano lì.
- La vista iniziale è `board` ovunque prima si partiva dal Diagramma: valore iniziale dello store e `navigate` all'avvio in `extension/src/webview/main.tsx`, `setProject` quando la cartella è (o diventa da fuori) un progetto, apertura ordinaria, apertura per un round di domande (`question-round.ROUND_OPENED`, il pannello si apre sulla Board con il round sopra), dopo `INITIALIZE_PROJECT` riuscito da Get Started, e alla conferma o all'annullamento del wizard aperto con il Modello vuoto (dal Diagramma o dal comando Import from Code) in `extension/src/webview/settings/index.tsx`. Riaprire il pannello già aperto lo porta in primo piano tenendo la vista.
- Il messaggio `navigate` dell'host accetta anche `history`. L'host apre il pannello su una vista precisa come fa oggi per `settings` e per i ghost: tiene la vista in `pendingView` e la manda al `ready` del webview (`extension/src/host/controller.ts`). I collegamenti interni (View on diagram, View requirements, chip, righe dei Drift, collegamento «Board» del Modello vuoto) restano come sono: un chip apre il focus nel Diagramma, nei Requisiti o nelle Specs (`developer.FOCUS_REF`); passare a un'altra vista dal menu laterale o con un comando non porta con sé il focus, e ogni vista tiene il suo.
- A ogni cambio di vista, anche per un focus o un collegamento interno, il webview manda all'host il messaggio nuovo `viewChanged` con la vista mostrata (aggiungerlo a `protocol.ts` e a `extension/src/host/messages.ts`); l'host lo inoltra al menu laterale e, alla chiusura del pannello, gli dice che nessuna vista è mostrata. L'inoltro al menu è parte del menu laterale; qui serve che il messaggio arrivi e che l'host conosca la vista corrente.
- In una finestra senza cartelle l'host apre il pannello soltanto per la vista `settings` (Show Settings, voce Settings del menu, Open Settings dell'avviso che omp non è installato), con un quadro senza progetto: il webview mostra solo il modulo delle impostazioni, senza Guided setup e senza Get Started. Ogni altra apertura senza cartelle resta come oggi: avviso «Trama: open a folder to use Trama.» e nessun pannello. Oggi `openSettings` rifiuta senza cartelle: va cambiato.
- Get Started mostra il testo del Modello vuoto «The Model is empty. Import the existing code or start from scratch; later, design changes from the Board.» in cima al Diagramma (non più «sotto le schede»), con «Board» collegamento con nome accessibile e tooltip «Open the Board».

## Vista History
- La colonna History della Board sparisce (stato `historyOpen`, sezione `data-column="history"` in `extension/src/webview/board/index.tsx`); le voci diventano la vista `history` del pannello, a tutta larghezza, che riusa `extension/src/webview/board/history.tsx` e `historyGroups`/`HISTORY_PERIODS` di `board/logic.ts`.
- In cima: il titolo `History`, accanto il numero delle voci che il periodo lascia vedere, a destra il menu del periodo (`Today`, `Last 7 days`, `Last 30 days`, `All`; iniziale `Last 7 days`; etichetta accessibile «History period»; senza icona). Sotto, le schede delle voci in una sola colonna, la più recente prima (a parità di istante l'ordine di creazione inverso), raggruppate per giorno locale con intestazioni `Today · 3`, `Yesterday · 5`, poi la data per esteso. Periodo vuoto: `Nothing done in this period`. Il periodo resta mentre la vista si aggiorna e mentre il developer cambia vista, e si dimentica alla chiusura del pannello.
- Una voce è una scheda con titolo, data (`HH:MM` in Today/Yesterday, giorno e ora per esteso altrove, data e ora complete nel tooltip) e riassunto Markdown in linea intero. Non ha pulsanti: la «i» (`Info`) sparisce. Il clic in ogni punto della scheda, o Invio/Spazio sul titolo, che è un pulsante raggiungibile da tastiera con il titolo come nome accessibile e tooltip `Show the Tasks of <titolo>`, apre la modale dei dettagli della voce; il puntatore è la manina. La modale resta quella di oggi; alla chiusura il focus torna al titolo della voce; seguire un chip chiude la modale e apre il focus di quel riferimento. La riga di un Task cancellato con Clear (copia `cleared` e badge `cleared`) è realizzata a parte, con i dati della voce.

## Board
- Niente più barra in alto con `Scan System` (sta nel menu laterale; `scanButtonLabel` resta per il Diagramma). Il `Scan` del Diagramma resta com'è.
- Colonne `Backlog`, `Active`, `Done`, in quest'ordine; la griglia è di tre colonne, la terza è la striscia collassata di Done quando è chiusa. I ghost restano in fondo a Backlog e Active e non contano.
- Il numero accanto al titolo di `Backlog`, `Active` e `Done` conta le schede vere della colonna. Il numero delle decisioni (schede di Backlog, ghost e Task Done esclusi) non è più mostrato dal pannello ma resta calcolato per la voce `Board` del menu laterale e il badge dell'icona; nei testi «il numero della scheda Board» diventa «il numero della voce Board del menu laterale».
- Unico pulsante che toglie schede: `Clear` in fondo a Done. Nessuno spostamento né trascinamento.

## Colonna Done
- `buildBoard` (`board/logic.ts`) non esclude più i Task Done: la colonna `Done` mostra una scheda per ogni Task in Done, anche chiuso senza modifiche, il più recente prima secondo l'istante di arrivo in Done (`finished`); i Task senza istante vengono dopo tutti gli altri, in ordine di creazione inverso.
- Le schede sono raggruppate per giorno locale di fine con le intestazioni della History (`Today · 3`, `Yesterday · 5`, data per esteso); i Task senza istante stanno in fondo sotto `Earlier`. Un gruppo vuoto non compare. Vuota, la colonna dice `Nothing done yet`.
- La scheda di un Task Done ha in testa il pallino di stato di Done, il numero breve o, senza numero, l'identità permanente, il titolo, il tag della Proposal (stesso chip e tooltip `From Proposal <id>: <titolo>` di Active) e l'ora di fine (`HH:MM` in Today/Yesterday, giorno e ora per esteso negli altri gruppi, data e ora complete nel tooltip); sotto, i chip dei riferimenti con gli stessi collegamenti e tooltip di un Task in Active. Nessun pulsante (né `Run`, né `View on diagram`, né `View requirements`) e nessun bordo animato.
- Badge, senza che il colore sia l'unico segnale: `unchanged` accanto al titolo per un Task chiuso senza modifiche, tooltip e nome accessibile `Closed without changes`; `kept` per un Task che un Drift aperto nomina come origine o come Task di correzione, tooltip e nome accessibile `Kept while Drift <numero breve> is open`, con più Drift separati da virgole in ordine di creazione (`Kept while Drift D3, D7 is open`); il badge sparisce appena nessun Drift aperto nomina più il Task.
- Il clic sulla scheda fuori da chip e badge, o Invio/Spazio sul suo titolo, apre la stessa modale dei dettagli di un Task in Active, con `Ask more` e `Close`; puntatore a manina.
- La colonna è collassabile con la chevron nell'intestazione (`ChevronRight` aperta, `ChevronLeft` collassata, 16 px, sola icona), tooltip e nome accessibile `Collapse Done column` / `Expand Done column`, `aria-expanded`. Collassata è una striscia stretta con la chevron e il titolo `Done` in verticale dall'alto in basso, senza schede, numero, `Nothing done yet` né `Clear`, e Backlog e Active si dividono lo spazio. È collassata alla prima Board dopo ogni apertura del pannello; la scelta resta mentre la Board si aggiorna e mentre il developer cambia vista, e si dimentica alla chiusura del pannello. Aprirla o chiuderla lascia il focus sulla chevron.

## Clear
- In fondo a `Done`, dopo le schede, anche a colonna vuota sotto il suo testo: `Clear`, `Button` variante `outline`, largo quanto la colonna, icona `Trash2` di `lucide-react` a sinistra del testo. Tooltip da abilitato e nome accessibile: `Delete the Tasks in Done for good`.
- Il clic, senza dialogo di conferma e senza avviso di riuscita, manda all'host `clearDone` con le identità dei Task che la colonna mostra; vengono cancellati tutti salvo quelli col badge `kept`, che restano (l'host ricontrolla quali si possono cancellare; la gestione del messaggio nell'host e in `src/core` è realizzata a parte). Le schede cancellate spariscono al quadro successivo. Dopo il clic il focus va alla chevron della colonna.
- `Clear` è visibile ma disabilitato (segnato per le tecnologie assistive, motivo nel tooltip e nella descrizione accessibile) mentre un Run lanciato da Trama non è finito, con `A run is in progress` (lo stesso testo di `Run all`), e quando non c'è nessun Task da cancellare, perché la colonna è vuota o ha solo Task `kept`, con `Nothing to clear`; quando valgono entrambi li dà tutti e due, prima `A run is in progress`.
- Se la cancellazione fallisce, un avviso in cima alla Board ne dice il motivo, con il pulsante `Close` degli altri avvisi; i Task non cancellati restano nella colonna.

## Schede e dettagli dei Task
- Sulla scheda di un Task in Active sparisce il pulsante `Open` (`FileInput`, `openFile` con `card.file` in `board/cards.tsx`): la Board non apre mai il file di un Task. `View on diagram`, `View requirements` e `Run` restano. Aggiornare `test/board-render.test.tsx`, che oggi si aspetta il pulsante «Open file of task T3». `Show details` non c'è già più.
- La modale dei dettagli di un Task (`board/dialogs.tsx`, oggi cercata solo in Active in `board/index.tsx`) segue il Task quando passa da Active a Done e si chiude da sola solo quando il Task non è più né in Active né in Done (per esempio cancellato da Clear) o quando il pannello si chiude. Resta da leggere: piede con soli `Ask more` e `Close`, nessuna apertura del file.

## Icone e testi
- Mappa delle icone `lucide-react` della Board: `Scan System` (nel menu laterale) e `Scan` del Diagramma usano `Search`; sparisce `FileInput` di `Open`; sparisce la «i» `Info` delle voci di History; nuova `Trash2` per `Clear`; la chevron è quella della colonna Done. Senza icona restano chip, tag, badge `blocked`, `waiting`, `Resolving`, `unchanged`, `kept`, le righe dei popup, le righe dei Drift della scheda di risoluzione e il menu del periodo della History. `extension/THIRD-PARTY-NOTICES.md` resta valido.
- I ghost non contano nel numero di nessuna colonna né in quello della voce Board del menu laterale; il loro nome accessibile non cambia.
