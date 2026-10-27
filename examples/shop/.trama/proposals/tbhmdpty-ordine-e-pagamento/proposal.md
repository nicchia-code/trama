---
status: approved
base:
  actors/stripe.md: new
  checkout/order.md: new
  checkout/payment.md: new
  requirements/data/area.md: 97d5b7dae9c2306df25e3ec5e8c9ea60eb1325695e8b94593dccf410f640881f
  requirements/data/main.md: new
  requirements/ui/main.md: 596d5dd8445ba555afcf6c736771efa0993571f2dcbff54f48353c0e5042134c
delete: []
created: 2026-10-26T19:07:22.722Z
label: Ordine e pagamento
---
# Ordine e pagamento

Dal carrello confermato nasce l'ordine, che il cliente paga con carta tramite Stripe.

- La Machine `order` parte da `Draft` e, alla conferma di un carrello non vuoto, passa ad `Awaiting payment` ed emette `CONFIRMED`.
- La Machine `payment` parte da `Idle`, alla conferma dell'ordine addebita (`Charging`) e, secondo la risposta di Stripe, emette `SUCCEEDED` o `DECLINED`.
- Un pagamento riuscito porta l'ordine in `Paid`; un pagamento rifiutato lo annulla e avvisa il cliente per email.
- Nuovo Actor `stripe`, il fornitore esterno dei pagamenti, con `CHARGE_OK` e `CHARGE_FAILED`.
- Dati: un ordine ha numero, cliente, righe, indirizzo di consegna e totale in centesimi; del pagamento si tiene solo l'ID del fornitore, mai il numero di carta.
- Interfaccia: un badge verde «Paid» accanto al numero dell'ordine pagato.
