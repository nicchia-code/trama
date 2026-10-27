---
column: done
technical: false
refs:
  - stripe.REFUND_DONE
  - payment/Paid/order.REFUND_REQUESTED
  - payment/Refunding
  - payment/Refunded
  - payment.REFUNDED
drift: null
proposal: rzl39x4f
agent: false
created: 2026-10-26T19:08:42.615Z
finished: 2026-10-26T19:08:42.942Z
---
# Rimborso

Il pagamento restituisce il denaro al cliente quando l'ordine lo chiede.

Alla fine vale questo:
- `order.REFUND_REQUESTED` su un pagamento in `Paid` lo porta in `Refunding` e chiede a Stripe di rimborsare il pagamento, con l'ID che Stripe ha dato a quel pagamento.
- La notifica di Stripe che il rimborso è fatto diventa `stripe.REFUND_DONE`: il pagamento in `Refunding` passa in `Refunded`, che è finale, ed emette `REFUNDED`.
- In ogni altro stato `order.REFUND_REQUESTED` non cambia nulla.
