---
column: done
technical: false
refs:
  - omp-chat
  - requirements/tech#omp-chat
  - requirements/ui#omp-chat
drift: null
proposal: c18149e0
agent: false
created: 2026-10-23T12:11:00.557Z
finished: 2026-10-23T12:13:21.845Z
---
# omp Chat a destra

La vista omp Chat, dove stanno le conversazioni di omp Chat, in VS Code e in ogni editor che non è Cursor sta in un contenitore proprio della barra laterale secondaria, a destra, come la chat di VS Code. In Cursor, che riserva quella barra alla sua chat, sta in un contenitore proprio del pannello in basso, e il developer può portarla a destra a mano. Gli stati della vista (nascosta all'inizio, vuota, con conversazioni) non cambiano.

Quando il lavoro è finito vale quanto segue.

**Contenitori e viste (`extension/package.json`).** Ci sono due contenitori con titolo `omp Chat` e l'icona del logo di Trama, ciascuno con una sola vista `webview` chiamata `omp Chat`:
- in `viewsContainers.secondarySidebar` il contenitore `trama-omp-chat-sidebar` con la vista `trama.ompChatSidebar`, con `when: trama.ompChatVisible == 'sidebar'`, per ogni editor che non è Cursor. Questo contenitore richiede VS Code 1.106 o successivo, senza API proposte; l'innalzamento dell'engine a `^1.106.0` è un lavoro a parte.
- in `viewsContainers.panel` il contenitore `trama-omp-chat` con la vista `trama.ompChat`, con `when: trama.ompChatVisible == 'panel'`, solo per Cursor. Gli id restano quelli di prima, così uno spostamento a mano già fatto dal developer in Cursor resta.

Entrambe le viste sono registrate sullo stesso `WebviewViewProvider` con `retainContextWhenHidden: true`; si mostra solo quella dell'editor in uso.

**Chiave di contesto.** L'host imposta con `setContext` la chiave `trama.ompChatVisible`: quando omp Chat è in uso (`trama.ompChat` attivo e `trama.agent` su omp) o quando c'è almeno una conversazione aperta in quella finestra vale `panel` in Cursor e `sidebar` in ogni altro editor; altrimenti vale `false`. Cursor si riconosce come Trama fa già (`vscode.env.appName` contiene «Cursor», `isCursor` in `extension/src/host/cursor.ts`). È l'unica chiave di contesto di Trama; la vista `trama.home` della barra di attività resta com'è.

**Mostrare la vista.** Per mostrare la vista l'host esegue il comando di focus della vista dell'editor in uso: `trama.ompChatSidebar.focus` fuori da Cursor, `trama.ompChat.focus` in Cursor, con `preserveFocus: true` per i lavori e senza per Quick Task e Ask more. Trama non apre e non chiude mai la barra laterale secondaria o il pannello per mostrare la vista, salvo quando una conversazione si apre o si riprende, e non sposta mai la vista: il developer può spostarla dove vuole, e lì resta. L'host non esegue altri comandi che aprono, chiudono o spostano barre laterali, pannelli o viste.

**Cursor.** In Cursor l'errore che l'editor registra all'avvio per il contenitore della barra laterale secondaria («View containers cannot be contributed to the Secondary Side Bar in Cursor…») è una conseguenza accettata. Va verificato con Cursor 3.27.6 che non tocchi le altre viste di Trama e che la vista rifiutata non compaia altrove (per esempio in Explorer, dove Cursor mette le viste di un contenitore che non esiste); se compare, la sua clausola `when` la tiene nascosta, perché in Cursor la chiave vale `panel` o `false`.

**Documentazione.** Il README (anche quello di `extension/`), il CHANGELOG, `docs/uat.md` e i testi che oggi descrivono dove sta la vista (per esempio l'ADR 0012) dicono che in VS Code la vista sta nella barra laterale secondaria e che in Cursor sta nel pannello in basso, da dove il developer la porta a destra con Move View e «New Secondary Side Bar Entry», e Cursor lo ricorda.
