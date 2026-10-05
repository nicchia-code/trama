---
column: done
technical: false
refs:
  - proposal
  - task
  - drift
  - requirements/ui#General
  - requirements/tech#General
drift: null
proposal: 2pqy2i0g
agent: false
created: 2026-10-05T10:04:46.200Z
---
# Mostrare il numero breve nella riga di comando e in --json

Dove la riga di comando nomina una Proposal, un Task o un Drift (`trama board`, i comandi `list`, `show` e `next`, i messaggi dei comandi, i badge `blocked` e `waiting`, i riferimenti a un'altra scheda) mostra il numero breve (`P3`, `T3`, `D3`) se la scheda è viva e, solo se non ne ha, l'identità permanente di otto caratteri; mai tutti e due insieme, con il titolo accanto come prima. Con `--json` ogni comando che descrive una scheda porta sia `id` (identità permanente) sia `number` (il numero breve come `T3`, o nessuno se la scheda è chiusa).
