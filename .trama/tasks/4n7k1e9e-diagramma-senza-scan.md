---
column: todo
technical: false
refs:
  - panel
  - requirements/ui#panel
drift: null
proposal: krziusik
agent: false
created: 2026-10-24T17:35:10.959Z
---
# Diagramma senza Scan

Il Diagramma non ha più il pulsante Scan, a nessun livello (radice, Whole System, Actor, Feature): Scan System del menu laterale è l'unico pulsante da cui Trama lancia uno scan. Il Diagramma resta senza pulsanti che avviano l'agente e senza un rimando al menu al posto di Scan.

Quando il Task è finito vale:

- Nella barra del Diagramma non c'è nessun pulsante `Scan`, né il suo numero `· N`, né il suo tooltip; il webview del pannello non manda più il messaggio `launch` con `kind: "scan"`.
- Il messaggio `snapshot` non porta più il campo `scans` (`advisorScanner`), e lo stato del Diagramma non ha più `advisorScanner`: il quadro del pannello serve ancora il numero dei Task finiti dall'ultimo scan globale solo a chi lo mostra (il menu laterale).
- L'icona `Search` resta solo per Scan System del menu laterale; nel Diagramma restano le icone di `Approve`, `Reject` e `Dismiss Drift`.
- La conferma dello scan di tutto il Sistema si apre solo da Scan System del menu laterale.
- Se resta senza usi, `scanFeature` dei livelli del Diagramma sparisce; `scanButtonLabel` e `SCANS_OFF_TOOLTIP` in `extension/src/webview/scan-label.ts` sono condivisi con il Task di Scan System: chi arriva per secondo non li reintroduce.
- `CHANGELOG.md` dice che il pulsante Scan del Diagramma è stato rimosso, e `docs/uat.md` non ha più i passi che premono Scan nel Diagramma (H2, H3, H4): lo scan del Sistema si prova da Scan System del menu laterale.

Posti nel codice già noti:

- `panel/Diagram` — `extension/src/webview/diagram/index.tsx` (calcolo di etichetta e disattivazione ~156-167, pulsante ~217-235, messaggio `launch` ~227, wiring ~319-320); `extension/src/webview/diagram/levels.ts` `scanFeature` (~64-67); `extension/src/webview/diagram/state.ts` `advisorScanner` (~35-36, 82, 192-195)
- `panel/Open` — `extension/src/host/controller.ts` invio di `snapshot` con `scans` (~729); `extension/src/protocol.ts` `scans` (~174-175); `extension/src/webview/main.tsx` (~96); `extension/src/webview/types.ts` (~19); gestione del messaggio `launch` nel controller (~874-875)
- `requirements/ui#panel` — `extension/src/webview/scan-label.ts`
