---
column: done
technical: true
refs:
  - requirements/ui#panel
  - requirements/tech#panel
drift: null
proposal: srkyrbvl
agent: false
created: 2026-10-24T10:27:31.669Z
finished: 2026-10-24T10:34:13.720Z
---
# Tabelle Markdown

Il renderer Markdown condiviso (`extension/src/webview/markdown.tsx`), usato da Diagramma, Board, Requisiti, overlay delle domande e omp Chat, rende le tabelle in stile GitHub invece di mostrarle come blocco di codice. Resta una funzione pura dal testo a elementi React, senza nuove librerie, senza `dangerouslySetInnerHTML`.

Quando è fatto:
- Il parser dei blocchi riconosce una tabella (riga di intestazione, riga separatrice che rispetta `TABLE_SEPARATOR`, righe del corpo; oggi `tableStart` attorno alle righe 281-284 la riconosce e attorno alle righe 386-388 la trasforma in un blocco di codice) come blocco `table` con gli allineamenti delle colonne: `:--` a sinistra, `:-:` al centro, `--:` a destra, senza due punti a sinistra. Una riga con meno celle dell'intestazione riceve celle vuote, una con più celle perde quelle in più. Le celle passano per lo stesso renderer inline dei paragrafi (grassetto, corsivo, codice inline, link solo http/https). L'HTML grezzo resta testo; il Markdown malformato si mostra come scritto.
- Il blocco si rende come un `div` con `overflow-x: auto` e `max-width: 100%` attorno a una `table` con `border-collapse: collapse` e nessuna larghezza fissa; l'allineamento va in `text-align`. Le celle hanno `max-width: 20rem` (circa 320 px), `overflow-wrap: break-word` (non `anywhere`: una colonna non si stringe sotto la sua parola più lunga e il riquadro scorre) e un piccolo padding; l'intestazione è in grassetto su fondo appena più scuro; le righe sono separate da linee sottili nel colore del bordo del tema. In `extension/src/webview/styles.css` le regole `.md table` (oggi attorno alle righe 118-134) lo fanno, e la regola `.md` con `overflow-wrap: anywhere` non raggiunge le celle.
- Il layout è solo CSS: la tabella segue ogni cambio di larghezza del pannello, della chat o di una barra laterale anche dopo il rendering, stringendosi e andando a capo o riallargandosi, senza larghezze vecchie o barre di scorrimento rimaste. Il pannello non scorre mai di lato per una tabella; il testo resta selezionabile.
- I test del renderer (`test/markdown.test.ts`, `test/markdown-render.test.tsx`) coprono tabella con allineamenti, celle con Markdown inline, righe corte e lunghe, e una tabella non valida mostrata come testo.

Gli altri punti di `ui#panel` e `tech#panel` toccati da questa Proposal sono di altri Task: il logo fuori dalla barra di stato → `Logo fuori dalla barra di stato`; la riga sotto `Scan System` nel menu laterale → `Menu laterale senza tooltip`; il colore del tag sul bordo delle schede → `Tag solo nei dettagli`; i tooltip in `ui#General` → `Menu a tendina senza tooltip`. Gli altri punti restano come sono.
