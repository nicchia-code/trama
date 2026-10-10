---
status: approved
kind: resolution
drifts:
  - drift: bvsk5sks
    decision: fix-code
    option: 1
base: {}
delete: []
created: 2026-10-10T17:52:41.317Z
---
# Ordinare le consegne a chat e terminale

- Drift bvsk5sks — Un avvio nel terminale aggira l’esclusione di un invio pendente alla chat: correggere il codice ordinando le consegne a entrambe le destinazioni. Ogni consegna attende l’esito della precedente e ricontrolla le condizioni prima dell’invio, così Run e Resolve Drifts non lavorano insieme; un invio incompatibile viene rifiutato spiegandone il motivo. Un lavoro è in corso solo quando l’istruzione parte davvero: appunti, conferma manuale e annullamento non lasciano blocchi permanenti. Più Run possono coesistere; scansioni, design e import restano indipendenti dall’esclusione reciproca.
