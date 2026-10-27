---
created: 2026-10-26T19:07:48.783Z
updated: 2026-10-26T19:07:48.783Z
summary: Dal carrello confermato nasce l'ordine, che il cliente paga con carta tramite Stripe; l'ordine pagato mostra un badge verde.
tasks:
  - 5kxgcbdb
  - 9q7ccp29
---
# Ordine e pagamento con Stripe

Secondo lavoro sul negozio.

- La Machine `order` nasce in `Draft`, passa ad `Awaiting payment` alla conferma di un carrello non vuoto e, secondo l'esito del pagamento, a `Paid` o a `Cancelled`.
- La Machine `payment` chiede a Stripe di addebitare il totale e segue le sue notifiche (`CHARGE_OK`, `CHARGE_FAILED`).
- Dell'ordine si tengono numero, cliente, righe, indirizzo e totale in centesimi; del pagamento solo l'ID di Stripe.
- L'ordine pagato mostra un badge verde «Paid».
