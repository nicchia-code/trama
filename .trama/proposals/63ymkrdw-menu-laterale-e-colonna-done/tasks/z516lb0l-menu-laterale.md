---
technical: false
refs:
  - menu-laterale
  - developer.OPEN_SIDE_MENU
  - developer.CLOSE_SIDE_MENU
  - project/Trama project/developer.OPEN_PANEL
  - agent-launching
  - requirements/ui#menu-laterale
  - requirements/tech#menu-laterale
  - requirements/tech#omp-chat
  - requirements/tech#project
---
# Menu laterale

La vista `trama.home` della barra delle attività diventa il menu laterale di Trama: è da qui che il developer sceglie che cosa mostra il pannello, che non ha più una barra delle schede (la rimozione delle schede e la vista `history` del pannello non fanno parte di questo Task).

## Manifest e attivazione
- Il contenitore `trama` in `contributes.viewsContainers.activitybar` resta com'è. La vista `trama.home` in `contributes.views.trama` diventa `"type": "webview"`, nome `Trama`, senza `when`: l'icona e la vista ci sono in ogni finestra, anche senza cartelle aperte e anche in una cartella che non è un progetto Trama, e compaiono senza avviare l'estensione. Aprire la vista avvia l'estensione con l'attivazione implicita; restano `onStartupFinished` e `workspaceContains:.trama/model/system.md`.
- Spariscono il `TreeDataProvider` vuoto di `trama.home` e il `contributes.viewsWelcome` (con la frase `Model, Board and Requirements of your project, in one panel.` e il pulsante `Open Trama`). Nessuna chiave di contesto nuova: `trama.ompChatVisible` resta l'unica, e `trama.home` non ne usa.
- L'icona è il logo di Trama (le barre intrecciate di `trama-icon.png`) in un solo colore, quello che l'editor dà alle icone della barra delle attività; tooltip e nome accessibile `Trama`; la vista ha titolo `Trama`.
- L'estensione non esegue mai comandi che aprono, chiudono o spostano la barra laterale o le sue viste, né quando il pannello si apre né dopo. Il pulsante di Trama nella barra di stato resta com'è e fa l'apertura ordinaria del pannello.

## Host e webview
- Un `WebviewViewProvider` registrato all'attivazione con `retainContextWhenHidden`, come quello di omp Chat. Il webview è un'app React 19 a sé, `extension/src/webview/menu/main.tsx`, raccolta da `scripts/build-extension.ts` in un bundle `iife` come omp Chat, con lo stesso foglio Tailwind, i componenti di `extension/src/webview/ui/`, le icone `lucide-react`, il tema del pannello (`trama.theme`) e la stessa CSP con nonce.
- L'host manda `menuState` con: situazione (`noFolder`, `notProject`, `project`; con più cartelle vale quella che vale per il pannello), numero di schede che aspettano una decisione, `tasksSinceScan`, se l'Advisor Scanner è attivo, e la vista che il pannello mostra o nessuna (pannello chiuso). Il numero viene dalla stessa funzione `boardDecisionCount` (con `buildBoard`) usata dal pannello, spostata dove anche l'host la può usare. Tutto si calcola dalla Snapshot che l'host legge con `src/core` sul watcher globale di `.trama/**`, così il menu si aggiorna anche a pannello chiuso; il messaggio riparte a ogni cambiamento, quando il menu diventa visibile e quando il pannello cambia vista o si chiude. Se la cartella diventa un progetto (wizard o da fuori) il menu passa a Project; se smette di esserlo torna a Not a project.
- Il menu manda all'host solo: `show` con una vista (`board`, `diagram`, `requirements`, `specs`, `history`, `settings`, `getstarted`), trattato come il comando omonimo; `scan`, che lancia lo scan del Sistema come faceva il messaggio `launch` con `kind: "scan"` della Board, con le stesse condizioni (Advisor Scanner compreso) e lo stesso ricordo dello scan; `openFolder`, che esegue `workbench.action.files.openFolder`.

## Contenuto del menu
- Ogni voce è un pulsante largo quanto la vista, con icona lucide a 16 px a sinistra del testo, nel colore del testo; raggiungibili con Tab nell'ordine di comparsa, attivabili con Invio o Spazio. Tooltip di ogni voce `Open <nome della voce> in the Trama panel` (es. `Open Board in the Trama panel`); nome accessibile il testo della voce.
- No folder: la frase `Open a folder to use Trama.`, sotto il pulsante primario `Open Folder` (icona `FolderOpen`) che apre la scelta della cartella dell'editor, e in fondo la voce `Settings`, che apre il pannello sulle sole impostazioni.
- Not a project: solo `Get Started` (icona `Rocket`), che fa l'apertura ordinaria del pannello (lo apre o lo porta in primo piano su Get Started), e in fondo `Settings`.
- Project, dall'alto: `Board` (`SquareKanban`), `Diagram` (`Network`), `Requirements` (`ListChecks`), `Specs` (`Package`), `History` (`History`); sotto, separato da uno spazio, il pulsante primario `Scan System` (`Search`); in fondo, separata da una linea, `Settings` (`Settings`). Scegliere una voce apre il pannello su quella vista o lo porta in primo piano passando a quella vista.
- `Board` mostra a destra un `Badge` con N quando N > 0 schede aspettano una decisione, e nome accessibile `Board, N awaiting a decision`; con N = 0 niente badge e nome `Board`.
- `Scan System` è il pulsante che prima stava nella barra della Board, con la stessa etichetta, il numero `· N` dei Task finiti dall'ultimo scan globale, tooltip, nome accessibile e disattivazione descritti in `ui#panel`: con l'Advisor Scanner attivo, con qualunque agente, resta al suo posto ma disattivato, senza numero, e dice che l'Advisor Scanner controlla il codice durante i Run. Premerlo lancia lo scan di tutto il Sistema senza aprire il pannello e senza spostare il focus. Lo scan del Sistema lo lancia solo il developer (da qui o dal pulsante Scan del Diagramma), mai Trama da sola.
- Con il pannello aperto la voce della vista mostrata (anche Get Started e Settings) è evidenziata con lo stile selezionato dei componenti e ha `aria-current="page"`; l'evidenza segue subito ogni cambio di vista, anche da collegamenti o comandi. A pannello chiuso nessuna voce è evidenziata.

## Badge dell'icona
- In un progetto Trama con N > 0 schede in attesa di decisione (lo stesso N della voce `Board`), l'host imposta `WebviewView.badge` a `{ value: N, tooltip: "N cards await a decision" }` (`1 card awaits a decision` al singolare), anche quando la vista non è mostrata; con N = 0 o fuori da un progetto Trama lo toglie (`undefined`).

## Comandi della palette
- `trama.showBoard`, `trama.showDiagram`, `trama.showRequirements`, `trama.showSpecs`, `trama.showHistory`, `trama.showSettings` in `contributes.commands`, `category` `Trama`, titoli `Show Board`, `Show Diagram`, `Show Requirements`, `Show Specs`, `Show History`, `Show Settings`: fanno ciò che fanno le voci omonime del menu. Fuori da un progetto Trama i comandi delle viste del progetto fanno l'apertura ordinaria di `trama.open`.

## Controllo delle skill
- Ogni voce del menu e ogni comando Show che apre il pannello o lo porta in primo piano fa, come l'apertura ordinaria, il controllo in sottofondo di ciò che Trama installa per l'agente (skill dell'agente, resti della skill Fix e del sotto-agente di smistamento, definizione del sotto-agente di omp, istruzioni dell'advisor, skill di Requisiti, resti per la chat di Copilot): il pannello si apre subito; se qualcosa è diverso lo porta in pari come Update skills, senza chiedere, con un avviso breve che le skill sono state aggiornate, e se è tutto in pari non dice nulla; se fallisce, un avviso di errore ne dice il motivo a ogni apertura finché il problema resta. Non crea le Aree di partenza e non converte le Aree a file unico. `Scan System` e `Open Folder` non aprono il pannello e non fanno il controllo.
