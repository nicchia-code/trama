---
status: approved
base:
  actors/user.md: 024967ac2c48dfbec3534c81532a534fc66c927cae3efdfc5df6752d006dba64
  actors/stripe.md: eef958e443c5e7e962d89cf8b1fc823e09a4e7c10a7fb3b4b345e98528839256
  checkout/order.md: 8a63dc1da5a0e0696dac2a60d2ac80223069654d2cf5331721af4c4eefbee37d
  checkout/payment.md: cbccc4b3adc32614c9472f5681fff30394a89738551005c85cde4fbc8d9f9c00
  requirements/ui/main.md: 47fb403e830a6cd4193f7df0e9a3abe03769f0c74f819599c6e2f251e62fe5dd
delete: []
created: 2026-10-26T19:08:19.347Z
label: Annullamento
---
# Annullamento e rimborso

Il cliente può annullare un ordine pagato e riavere i soldi.

- Nuovo Event `user.CANCEL`.
- Se la preparazione non è ancora iniziata, l'ordine passa subito ad `Cancelled` e il cliente è rimborsato; se è già iniziata, l'ordine passa a `Refunding` e diventa `Cancelled` quando il denaro è tornato (`payment.REFUNDED`).
- L'ordine emette `REFUND_REQUESTED` quando bisogna restituire il denaro; il pagamento da `Paid` passa a `Refunding` e poi a `Refunded` (finale) alla notifica `stripe.REFUND_DONE`, emettendo `REFUNDED`.
- Interfaccia: «Cancel order» è un pulsante secondario che chiede conferma.
