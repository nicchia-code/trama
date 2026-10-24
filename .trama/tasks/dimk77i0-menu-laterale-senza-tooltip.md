---
column: done
technical: false
refs:
  - menu-laterale
  - requirements/ui#menu-laterale
  - requirements/tech#menu-laterale
drift: null
proposal: srkyrbvl
agent: false
created: 2026-10-24T10:27:31.669Z
finished: 2026-10-24T10:33:23.021Z
---
# Menu laterale senza tooltip

Il menu laterale (`extension/src/webview/menu/app.tsx`) non mostra più nessun suggerimento al passaggio del puntatore, in nessuna modalità: né le voci (`Board`, `Diagram`, `Requirements`, `Specs`, `History`, `Settings`, `Get Started`), né `Scan System`, né `Open Folder`. Ogni voce si riconosce dal suo testo e dalla sua icona; il nome accessibile resta il testo della voce, quello di `Board` è `Board, N awaiting a decision` con N > 0 schede che aspettano una decisione, quello di `Scan System` ripete etichetta e motivo come in `ui#panel`. Restano soltanto i tooltip che l'editor dà da sé all'icona della barra delle attività e al suo badge.

Quando è fatto:
- In `app.tsx` non ci sono più il componente `Tip`, il `TooltipProvider` attorno a `MenuApp`, l'import da `../ui/tooltip`, il `Tip` attorno a `Open Folder` né lo `span` che in `ScanSystem` avvolgeva il pulsante disabilitato per tenerne visibile il tooltip; nessun elemento del menu ha un attributo `title`. `entryTooltip` in `extension/src/webview/menu/logic.ts` sparisce, con i suoi usi.
- `Scan System` disabilitato dall'Advisor Scanner (con qualunque agente) resta al suo posto, con l'etichetta di sempre senza `· N` e l'icona `Search`, e mostra sotto di sé, solo in modalità larga, una riga in testo secondario e piccolo: `Scans are off: the Advisor Scanner checks the code during Runs.`. La riga ha un `id` ed è collegata al pulsante con `aria-describedby`, così fa parte della sua descrizione accessibile. Con l'Advisor Scanner non attivo la riga non c'è. Premere `Scan System` abilitato apre ancora la conferma dello scan di tutto il Sistema.
- La modalità solo icone scatta sotto i 56 px di larghezza della vista (l'icona a 16 px con il margine del pulsante e della vista): tutte le varianti `@max-[200px]:` del container `@container` della `nav` diventano `@max-[56px]:`. Sotto quella soglia ogni voce e pulsante mostra solo l'icona centrata, senza testo, `Badge`, numero `· N`, riga di disattivazione di `Scan System` né frase `Open a folder to use Trama.`, e senza tooltip; i nomi accessibili restano quelli della vista larga. Da 56 px in su il menu mostra i testi, quindi nelle barre laterali dell'editor (mai sotto circa 170 px) mostra sempre i testi. Resta solo CSS, senza `ResizeObserver` né messaggi.
- `test/menu-webview.test.tsx` (e `test/menu-model.test.ts` se prova `entryTooltip`) non controlla più tooltip, `TooltipProvider` o la soglia di 200 px: controlla invece che nessun elemento abbia un tooltip o un `title`, la riga di disattivazione con `aria-describedby` e la classe `@max-[56px]:hidden` sui testi.
