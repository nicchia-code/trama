---
created: 2026-10-26T19:08:12.734Z
updated: 2026-10-26T19:08:12.734Z
summary: Un ordine pagato viene impacchettato dal magazzino e ritirato dal corriere, fino allo stato Shipped.
tasks:
  - cv0jurdy
  - vrguc9zh
---
# Magazzino e corriere

Terzo lavoro sul negozio.

- L'ordine pagato parte in `Preparing` e chiede al magazzino di impacchettarlo.
- `warehouse.PACKAGE_READY` lo porta in `Ready to ship` e chiede il ritiro al corriere.
- `courier.PICKED_UP` lo porta in `Shipped`, stato finale.
