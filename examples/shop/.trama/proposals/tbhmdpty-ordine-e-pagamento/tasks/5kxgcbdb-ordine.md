---
technical: false
refs:
  - order
  - requirements/data#order
  - requirements/ui#order/Paid
---
# Ordine

L'ordine nasce insieme al carrello del cliente e ne segue il percorso fino al pagamento.

Alla fine vale questo:
- Un ordine ha un numero, il cliente, le righe (prodotto, quantità, prezzo unitario), un indirizzo di consegna e un totale. I totali sono in centesimi.
- L'ordine nasce in `Draft`, mentre il cliente sceglie cosa comprare.
- `cart.CONFIRM` porta l'ordine da `Draft` ad `Awaiting payment` solo se il carrello non è vuoto; l'ordine prende le righe del carrello, ne calcola il totale ed emette `CONFIRMED`.
- `payment.SUCCEEDED` da `Awaiting payment` porta l'ordine in `Paid`.
- `payment.DECLINED` da `Awaiting payment` porta l'ordine in `Cancelled` e avvisa il cliente per email.
- Lo schermo dell'ordine pagato mostra un badge verde «Paid» accanto al numero dell'ordine.
