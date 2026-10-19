---
technical: false
refs:
  - task
  - announcement
  - drift
---
# Run senza scan

Fatto quando, in un Run la cui istruzione porta la frase dell'Advisor Scanner:
- la skill `trama-implement` non fa il pre-flight e non annuncia il suo controllo prima dei Task;
- il controllo finale della corsa passa da Verifying direttamente all'aggiornamento della History, senza la scansione mirata di fine corsa né la fase Scanning;
- quando l'advisor dice che il lavoro di un Task si allontana dal Task, dal Modello o dai Requisiti, l'agente lo corregge prima di portare il Task in Done;
- un Drift che l'advisor registra non ha origine: blocca i Task non Done che riguardano la stessa cosa, mentre un Task già In progress può finire, e la corsa prosegue con gli altri; l'advisor non dà il giudizio del blocco sperimentale;
- senza la frase la skill fa pre-flight e scansione mirata come oggi.
