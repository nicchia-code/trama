---
status: approved
base:
  system.md: e5160e9e7bef6937bfa9867f8e2c51ba19af308ba3432e25bd22720c82cc7c26
  actors/user.md: new
  checkout/feature.md: new
  checkout/cart.md: new
  requirements/ui/area.md: 67fe3f632baa6c808ff82a6da2942decec9beb4618dcc8cbf70ffd586a10bfa3
  requirements/ui/main.md: new
delete: []
created: 2026-10-26T19:06:07.653Z
label: Carrello e checkout
---
# Carrello e checkout

Primo disegno del negozio: un sito che vende libri stampati a clienti privati. Il cliente riempie un carrello e lo conferma, chiedendo di procedere al pagamento.

- Il System descrive il negozio.
- L'Actor `user` mette libri nel carrello (`ADD_ITEM`) e chiede di procedere (`CHECKOUT`).
- La Feature `checkout` ha la Machine `cart`: da vuoto a pieno, poi confermato con l'Event `CONFIRM`, emesso solo da un carrello non vuoto.
- Interfaccia mobile first, con gli importi a due decimali e il totale del carrello in fondo a ogni schermata di checkout.
