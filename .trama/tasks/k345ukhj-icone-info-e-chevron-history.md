---
column: done
technical: true
refs:
  - requirements/ui#panel
  - requirements/tech#panel
drift: null
proposal: uvn8ulmq
agent: false
created: 2026-10-17T10:26:31.354Z
finished: 2026-10-17T11:22:15.650Z
---
# Icone «i» e chevron della colonna History

Quando il Task è finito, la «i» di ogni voce di History è un pulsante a sola icona con il glifo codicon `info` a 16 px, e il `Close` della modale dei dettagli di una voce usa l'icona `close` come il `Close` degli avvisi. La chevron della colonna History usa `chevron-right` quando la colonna è aperta e `chevron-left` quando è collassata, a 16 px, con gli stessi tooltip e nome accessibile della colonna. Le icone hanno il colore del testo del pulsante e sono decorative.

Come le altre icone del pannello, `info` e la chevron sono SVG inline nel codice del webview ricavati dai glifi codicon, senza font di icone né nuove dipendenze; `extension/THIRD-PARTY-NOTICES.md` nomina il glifo `info` fra quelli usati. Togliere ogni riferimento alla chevron della colonna Done.
