---
column: done
technical: false
refs:
  - panel
drift: null
proposal: p5ty6g5g
agent: false
created: 2026-10-20T21:11:40.631Z
finished: 2026-10-20T21:37:48.534Z
---
# Pulizia del disegno vecchio

Si fa per ultimo, dopo tutti gli altri Task di questa Proposal.

- **Codice da togliere.** Nel webview non resta nessun codice di disegno senza React:
  - l'helper `el()` e gli altri costruttori di DOM;
  - gli SVG dei glifi codicon (`icons.ts`);
  - `shell.css` e i CSS delle schede;
  - il componente che ospitava le schede vecchie.
- **Controlli sul codice.**
  - Nessun colore del webview viene dalle variabili `--vscode-*`: restano solo i due caratteri.
  - Nessun `innerHTML` né `dangerouslySetInnerHTML`.
- **Test.** Il DOM finto scritto a mano nei file di test sparisce. Tutti i test della webview usano happy-dom e Testing Library, oppure solo la logica pura.
- **Documentazione.** `docs/`, le README e lo script di accettazione (`docs/uat.md`) descrivono il nuovo aspetto, l'impostazione `Theme` e le icone lucide.
- **Verifica finale.** Il pannello si prova a mano in VS Code in tema chiaro, scuro e ad alto contrasto, con `Theme` su Auto, Light e Dark.
