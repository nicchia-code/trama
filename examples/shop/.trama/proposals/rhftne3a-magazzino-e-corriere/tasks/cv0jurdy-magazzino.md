---
technical: false
refs:
  - warehouse
  - warehouse.PACKAGE_READY
  - order/Preparing
  - order/Ready to ship
---
# Magazzino

Un ordine pagato viene preparato dal magazzino, che dice quando il pacco è pronto.

Alla fine vale questo:
- Quando l'ordine entra in `Paid` parte in `Preparing` e il magazzino riceve la richiesta di impacchettarlo, con le righe e l'indirizzo di consegna.
- Il magazzino segnala che il pacco è pronto: la segnalazione diventa `warehouse.PACKAGE_READY`.
- `warehouse.PACKAGE_READY` da `Preparing` porta l'ordine in `Ready to ship`; da ogni altro stato non succede nulla.
- Entrato in `Ready to ship`, l'ordine chiede al corriere di ritirare il pacco.
