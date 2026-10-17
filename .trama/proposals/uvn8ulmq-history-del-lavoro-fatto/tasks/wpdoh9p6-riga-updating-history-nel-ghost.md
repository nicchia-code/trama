---
technical: true
refs:
  - requirements/ui#announcement
---
# Riga di fase `Updating History` nel ghost del controllo

Il ghost di un controllo in fase `history` mostra in Active, con lo stesso scheletro, gli stessi limiti e lo stesso shimmer degli altri ghost, la riga di fase `Updating History`, accanto a `Verifying (tests, lint, build)` e `Scanning` delle altre fasi; un round di domande aperto non la cambia. Il nome accessibile diventa `Agent checking the code: <title>, Updating History`. Il protocollo fra host e webview (`extension/src/protocol.ts`) trasporta la nuova fase e il webview la rende; aggiornare i test del rendering dei ghost con il caso della fase History.
