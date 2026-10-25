---
refs:
  - panel
  - requirements/ui#panel
  - requirements/ui#panel/Get Started
  - requirements/tech#panel
technical: false
---

# Titolo scheda dal nome vista

Al termine, la scheda dell'editor del panel (`WebviewPanel.title`) porta il nome della vista che il panel mostra, con le stesse parole della voce del menu laterale: `Board`, `Diagram`, `Requirements`, `Specs`, `History`, `Settings` o `Get Started`. La scheda non mostra mai il nome del System, il nome della cartella né `Trama`: il nome del System compare invece nel menu laterale (Machine `menu-laterale`, altra Task della stessa Proposal).

Cosa deve valere:

- Il titolo cambia appena il panel cambia vista, qualunque sia l'origine: menu laterale, comando della palette, un focus o un link interno. Una nuova immagine del panel (refresh) non cambia mai il titolo.
- Con il setup wizard aperto dentro Settings (Guided setup, che resta la vista `settings`) il titolo resta `Settings`.
- In una finestra senza cartelle, dove il panel mostra solo le impostazioni, il titolo è `Settings`.
- In Get Started il titolo è `Get Started`, oppure `Settings` mentre mostra le impostazioni.

Come va costruito (requisito `tech#panel`):

- Le etichette delle viste stanno in un unico modulo condiviso, usato sia dall'host per il titolo sia dal menu laterale come `ENTRY_LABELS` (`extension/src/webview/menu/logic.ts:5`), così le parole restano identiche. Gli id delle viste sono `ViewName` in `extension/src/protocol.ts:173`.
- `create()` in `extension/src/host/controller.ts` (riga ~768-769) imposta il titolo della vista su cui il panel si apre: la `pendingView` (controller.ts:164) se presente, altrimenti `board`, oppure `getstarted` fuori da un progetto Trama, oppure `settings` senza cartelle.
- `setPanelView` (controller.ts:308), da cui passa ogni cambio di vista (incluso `viewChanged` :1048, la chiusura :807, `ready` :1058, `show` :281), imposta il titolo della nuova vista. Il Guided setup resta vista `settings` (main.tsx:127; controller.ts:197-198), quindi il titolo resta `Settings`.
- `refresh()` (controller.ts:878, 881, 893) non tocca più il titolo.
- Il panel smette di usare `Controller.projectTitle` (controller.ts:858). La Task del menu laterale crea una funzione host esportata per il nome del progetto; `Controller.projectTitle` va rimosso dalla Task che, al suo turno, lo trova senza più chiamanti.
- `docs/uat.md` (righe 79, 88, 100) smette di aspettarsi una scheda intitolata `Trama` e nomina la scheda con la sua vista.
- Il container `trama` e la vista `trama.home` in `extension/package.json` restano `Trama`; i test di `test/activity-bar-manifest.test.ts` non cambiano.
