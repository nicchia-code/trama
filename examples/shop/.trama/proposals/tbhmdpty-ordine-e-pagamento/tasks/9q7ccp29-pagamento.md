---
technical: false
refs:
  - payment
  - stripe
  - stripe.CHARGE_OK
  - stripe.CHARGE_FAILED
  - requirements/data#payment
---
# Pagamento con Stripe

Il pagamento di un ordine passa da Stripe, che risponde con una notifica.

Alla fine vale questo:
- `order.CONFIRMED` porta il pagamento da `Idle` a `Charging` e chiede a Stripe di addebitare il totale dell'ordine.
- La notifica di Stripe che l'addebito è riuscito diventa `stripe.CHARGE_OK`: il pagamento passa in `Paid` ed emette `SUCCEEDED`. Il pagamento tiene l'ID che Stripe ha dato al pagamento, e mai un numero di carta.
- La notifica di Stripe che la carta è stata rifiutata diventa `stripe.CHARGE_FAILED`: il pagamento passa in `Declined` ed emette `DECLINED`.
- Le notifiche di Stripe si riconoscono dal numero d'ordine che il pagamento ha lasciato a Stripe quando ha chiesto l'addebito.
