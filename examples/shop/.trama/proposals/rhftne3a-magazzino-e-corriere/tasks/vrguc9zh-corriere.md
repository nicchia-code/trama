---
technical: false
refs:
  - courier
  - courier.PICKED_UP
  - order/Shipped
---
# Corriere

Il corriere ritira il pacco e l'ordine è spedito.

Alla fine vale questo:
- Il corriere segnala il ritiro del pacco: la segnalazione diventa `courier.PICKED_UP`.
- `courier.PICKED_UP` da `Ready to ship` porta l'ordine in `Shipped`, che è finale.
