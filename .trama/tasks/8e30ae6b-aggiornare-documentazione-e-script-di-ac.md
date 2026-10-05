---
column: done
technical: true
refs:
  - requirements/tech#question-round
  - requirements/ui#question-round
drift: null
proposal: null
agent: false
created: 1970-01-01T00:00:00.162Z
---
# Aggiornare documentazione e script di accettazione per l'overlay delle domande

La documentazione e lo script di accettazione descrivono il round di domande come overlay nel pannello, non più come Quick Pick.

Fatto quando:
- `docs/cli.md` descrive i campi facoltativi `context` e `details` della richiesta di `trama ask`, con le loro regole di validazione;
- il README principale e quello dell'estensione non parlano più di Quick Pick, Other, input box ed Escape, e descrivono l'overlay, l'indice, il riepilogo con Send to agent, la riduzione a barra e la notifica Reopen;
- lo script di accettazione ha i passi per provare l'overlay in VS Code e in Cursor: apertura del pannello in primo piano, navigazione dall'indice, Skip e Skip all con conferma, invio dal riepilogo, riduzione a barra, chiusura e riapertura del pannello, Esc che non fa nulla e la vista stretta sotto i 600 px.
