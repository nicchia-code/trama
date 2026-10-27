---
technical: true
refs:
  - requirements/tech#demo
---
# Negozio d'esempio

`examples/shop` diventa il progetto della demo del sito: un piccolo negozio con codice vero e un `.trama/` con una storia già vissuta.

Quando il Task è finito:
- `examples/shop/src/` contiene una piccola base di codice TypeScript del negozio (carrello, checkout, ordine, pagamento e gli adattatori degli Actor: utente, Stripe, magazzino, corriere), leggibile in pochi minuti, che realizza il Model del negozio in `examples/shop/.trama/model/` con una sola differenza voluta: quella che lo scan del capitolo Scan and Drifts del tour trova e trasforma in un Drift con Fix options sensate. Il codice non ha codici sconto, che il design del tour aggiunge.
- `examples/shop/.trama/` contiene una History con il lavoro che ha costruito il negozio fin qui, Proposal approvate e Task in Done, così che History e schede chiuse della demo non siano vuote. Non contiene Proposal aperte, Task in To do né Drift: quelli nascono dal tour.
- Il progetto passa `trama model check` e `trama project show` dalla sua cartella, ed è prodotto con i comandi di Trama (non scrivendo a mano nei file delle schede), così che i file siano quelli che Trama scriverebbe.
- La differenza voluta e i contenuti della History sono descritti in un breve `examples/shop/README.md` per chi mantiene i copioni della demo.
