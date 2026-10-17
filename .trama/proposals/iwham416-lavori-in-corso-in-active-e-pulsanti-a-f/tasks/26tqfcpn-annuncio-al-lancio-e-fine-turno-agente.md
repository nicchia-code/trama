---
technical: false
refs:
  - agent-terminal
---
# Annuncio al lancio di ogni lavoro e fine del turno che libera i pulsanti

Quando il Task è finito, nel terminale dell'agente come nella chat:

- Ogni lavoro che Trama lancia, salvo un Run, è annunciato appena l'istruzione parte davvero (non prima, e non se l'invio fallisce), così la colonna Active lo mostra fin dal lancio: un design e Resolve Drifts annunciano la Proposal che l'agente creerà, uno scan annuncia il suo controllo, un import annuncia il lavoro stesso. L'annuncio appartiene al terminale in cui Trama scrive l'istruzione oppure, con la chat (Cursor o Copilot), alla chat del progetto. Va tolto il comportamento attuale per cui con la chat Trama non annuncia nulla e la Board aspetta che l'agente cominci la Draft: nessun ramo separato resta nel codice dell'host.
- La raccolta automatica dei Drift annuncia la propria Proposal come Resolve Drifts, con i Drift che ha raccolto. Il suo agente scrive e consegna la Proposal senza approvarla di propria iniziativa; Trama verifica la delega prima dell'approvazione e prima di avviare il Run successivo, come oggi.
- Ogni fine del turno dell'agente che Trama riconosce (hook a riposo, fine del comando, chiusura del terminale, fine o interruzione del turno della chat, chiusura della conversazione) libera anche i pulsanti delle schede che quell'agente ha consegnato in quel turno: l'host collega questi segnali all'insieme delle schede in attesa, così che dal pannello si possano decidere o avviare solo dopo quella fine. Nessun timer: conta solo il segnale di fine turno.

Aggiornare i test dell'host sul lancio dell'agente e sugli annunci, e la documentazione in `docs/` che descrive l'annuncio solo per i terminali.
