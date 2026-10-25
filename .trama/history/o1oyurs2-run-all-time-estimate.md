---
created: 2026-10-24T16:44:14.288Z
updated: 2026-10-25T09:50:24.341Z
summary: Mentre un Run all lavora, il pulsante mostra il tempo che manca stimato da Trama senza modello, in forchetta nel tooltip e come barra nel pulsante; «più lungo del previsto» scatta solo oltre un riferimento fissato al primo Task preso.
tasks:
  - nqwjne3p
  - jz9q6bjr
  - sz5n5wag
  - 1q7djv44
  - tfqpi8lq
cleared:
  tfqpi8lq:
    title: Riferimento di Run all
    proposal: d08p2hsw
    tag: Stima Run all
    finished: 2026-10-25T09:09:47.168Z
    refs:
      - panel/Board
      - requirements/rules#drift-resolution/Running tasks
      - requirements/tech#drift-resolution/Running tasks
      - requirements/ui#drift-resolution/Running tasks
  1q7djv44:
    title: Barra di Run all
    proposal: 2fwrajhi
    tag: Run all bar
    finished: 2026-10-24T19:23:34.661Z
    refs:
      - drift-resolution/Running tasks
      - requirements/rules#drift-resolution/Running tasks
      - requirements/ui#drift-resolution/Running tasks
      - requirements/tech#drift-resolution/Running tasks
  jz9q6bjr:
    title: Pulsante Run all con la stima
    proposal: l0hv1zbz
    tag: Run all ETA
    finished: 2026-10-24T16:42:22.864Z
    refs:
      - panel/Board
      - requirements/ui#drift-resolution/Running tasks
  nqwjne3p:
    title: Stima di Run all nel core
    proposal: l0hv1zbz
    tag: Run all ETA
    finished: 2026-10-24T16:39:59.806Z
    refs:
      - drift-resolution/Running tasks
      - requirements/rules#drift-resolution/Running tasks
      - requirements/rules#work
      - requirements/tech#drift-resolution/Running tasks
  sz5n5wag:
    title: Unioni come ordini
    proposal: l0hv1zbz
    tag: Run all ETA
    finished: 2026-10-24T16:34:43.551Z
    refs:
      - work
      - requirements/tech#work
---
# Stima del tempo di Run all

Trama stima il tempo che manca a un Run all dal piano che il Run ha registrato, dai Task rimasti e dalla durata dei Task finiti, senza alcun modello. L'host manda il risultato alla Board nello snapshot, aggiornato a ogni cambio sotto .trama/ e ogni minuto. Il pulsante Run all lo mostra al posto del proprio nome, oppure dice che il Run sta durando più del previsto. La parte Parallel execution della skill trama-implement registra ogni unione di gruppi come ordine, così la catena di un sotto-agente entra nella stima.

Il riferimento per «Taking longer than expected» non si fissa più alla prima stima non nulla. Quella nasceva con il primo `queue`, 20–40 secondi prima che l'agente registrasse le scelte `order` e `conflict`, quindi era troppo bassa e il Run all sembrava in ritardo pur andando normalmente. Ora:

- Le registrazioni di un terminale o di una conversazione riusati, fatte prima del lancio del Run all, non contano come del Run. Contano solo per i pesi dei Task.
- Il riferimento non esiste finché un Run del Run all non ha preso il suo primo Task. Prima di allora il Run all non è mai più lungo del previsto.
- Al primo Task preso il riferimento è il tempo passato dal lancio più il limite alto, cioè 1,5 volte la stima centrale. Si rifà a ogni cambio del piano, cioè una nuova scelta `order` o `conflict` o un Task nuovo nel Run.
- Il Run all è più lungo del previsto finché il tempo passato supera il riferimento attuale. Se un cambio del piano porta il riferimento oltre il tempo passato, il pulsante torna a `Running…` e la barra riprende l'avanzamento anche sotto il 95%.
