---
status: approved
base:
  actors/warehouse.md: new
  actors/courier.md: new
  checkout/order.md: abadabc4a34fa316701e63a13e4fa139b6a1bdc2e52d2a2b87ef5ae35007918f
delete: []
created: 2026-10-26T19:07:54.461Z
label: Spedizione
---
# Magazzino e corriere

Un ordine pagato viene preparato dal magazzino e ritirato dal corriere.

- Nuovo Actor `warehouse`, con `PACKAGE_READY` quando l'ordine è impacchettato.
- Nuovo Actor `courier`, con `PICKED_UP` quando il pacco è ritirato.
- L'ordine pagato (`Paid`) parte da `Preparing`; `warehouse.PACKAGE_READY` lo porta in `Ready to ship`; `courier.PICKED_UP` in `Shipped`, stato finale.
