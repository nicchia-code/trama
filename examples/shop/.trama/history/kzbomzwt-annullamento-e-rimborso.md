---
created: 2026-10-26T19:08:43.028Z
updated: 2026-10-26T19:08:43.028Z
summary: "Il cliente annulla un ordine pagato: subito se nulla è stato preparato, dopo il rimborso di Stripe altrimenti."
tasks:
  - 4qfr7rpk
  - wyhv52ia
---
# Annullamento e rimborso

Quarto lavoro sul negozio.

- `user.CANCEL` su un ordine pagato lo porta in `Cancelled` se la preparazione non è iniziata, in `Refunding` altrimenti; in entrambi i casi l'ordine emette `REFUND_REQUESTED`.
- Il pagamento chiede a Stripe il rimborso e, alla notifica `REFUND_DONE`, passa in `Refunded` ed emette `REFUNDED`, che chiude l'annullamento dell'ordine in `Refunding`.
- «Cancel order» è un pulsante secondario che chiede conferma.
