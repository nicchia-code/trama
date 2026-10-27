---
column: done
technical: false
refs:
  - user.CANCEL
  - order/Paid/user.CANCEL
  - order/Refunding
  - order.REFUND_REQUESTED
  - requirements/ui#order/Paid
drift: null
proposal: rzl39x4f
agent: false
created: 2026-10-26T19:08:42.615Z
finished: 2026-10-26T19:08:42.767Z
---
# Annullamento dell'ordine

Il cliente annulla un ordine pagato, e ottiene il rimborso.

Alla fine vale questo:
- `user.CANCEL` su un ordine in `Paid` ha due esiti, secondo la preparazione. Se nulla è stato ancora preparato, l'ordine passa in `Cancelled` e il cliente è rimborsato. Se la preparazione è iniziata (il magazzino ha preso in carico l'ordine, anche quando è già in `Ready to ship`), l'ordine passa in `Refunding`.
- In entrambi i casi l'ordine emette `REFUND_REQUESTED`, perché il denaro deve tornare al cliente.
- In `Refunding`, `payment.REFUNDED` porta l'ordine in `Cancelled`.
- `user.CANCEL` in ogni altro stato non cambia nulla: un ordine spedito o già annullato non si annulla.
- Nella schermata dell'ordine pagato «Cancel order» è un pulsante secondario e chiede conferma prima di annullare.
