---
column: done
technical: false
refs:
  - developer.OPEN_PANEL
  - project/Trama project/developer.OPEN_PANEL
  - requirements/rules#project
  - requirements/tech#announcement
  - requirements/ui#announcement
drift: null
proposal: srkyrbvl
agent: false
created: 2026-10-24T10:27:31.669Z
finished: 2026-10-24T10:33:02.666Z
---
# Logo fuori dalla barra di stato

Nella barra di stato non c'è più un pulsante con il logo di Trama: l'icona di Trama sta nella barra delle attività e l'apertura ordinaria del pannello (Open Trama) passa dal comando `Trama: Open` nella palette, dalla voce `Get Started` del menu laterale in una cartella che non è un progetto Trama e dal Reopen dell'avviso delle domande. Con il pannello già aperto il comando lo porta in primo piano tenendo la sua vista. Il controllo in sottofondo delle skill dell'agente all'apertura (`project/Trama project/developer.OPEN_PANEL`, `rules#project`) parte dal comando Open Trama, dal Reopen dell'avviso delle domande, dalle voci del menu laterale e dai comandi Show … che aprono il pannello o lo portano in primo piano, anche con il pannello già aperto; non parte quando il pannello si apre da solo per un round di domande, senza cartelle né su Get Started. Questo Task realizza anche il punto di `tech#panel` che dice che Trama non crea nessuna voce della barra di stato con il logo (gli altri punti di `tech#panel` sono del Task `Tabelle Markdown` e degli altri Task che vi rimandano).

Quando è fatto:
- In `extension/src/host/main.ts` la funzione `statusBarItem()` (che creava l'elemento con `$(trama-logo)`) e il suo inserimento nelle `subscriptions` all'attivazione spariscono.
- `contributes.icons["trama-logo"]` sparisce da `extension/package.json`; il file `extension/media/trama-logo.woff`, lo script `scripts/icon-font.ts` (con l'eventuale script di `package.json` che lo lancia) e la dipendenza di sviluppo `fantasticon` del `package.json` della radice spariscono, con il lockfile aggiornato e con le loro righe in `extension/THIRD-PARTY-NOTICES.md` se ci sono. Le Specs della Proposal tolgono già fantasticon.
- L'elemento dei ghost della barra di stato (`extension/src/host/activities-item.ts`, identità `trama.activities`, nome `Trama Activities`, `StatusBarAlignment.Left`, priorità molto bassa come `-10000`) resta com'è ed è l'unica voce di Trama nella barra di stato (`tech#announcement`, `ui#announcement`): sta in fondo al gruppo di sinistra, c'è solo mentre esiste almeno un ghost senza colonna, e il suo nome nel menu della barra di stato è `Trama Activities`, senza riferimenti al logo.
- Commenti, test e documentazione (README, `CHANGELOG.md` con una voce nuova) non parlano più del pulsante del logo nella barra di stato né del font di icone.
