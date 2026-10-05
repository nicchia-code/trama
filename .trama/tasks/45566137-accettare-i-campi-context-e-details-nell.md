---
column: done
technical: false
refs:
  - question-round/Not asked/agent.ASK_QUESTIONS
  - requirements/data#question-round
  - requirements/rules#question-round
drift: null
proposal: a19cef66
agent: false
created: 1970-01-01T00:00:00.155Z
---
# Accettare i campi context e details nelle richieste di trama ask

Una richiesta di `trama ask` può portare un contesto per ogni domanda e dei dettagli per ogni opzione, che arrivano fino all'editor.

Fatto quando:
- una domanda accetta `context` e un'opzione accetta `details`, entrambi stringhe Markdown facoltative;
- se presenti, devono essere non vuoti dopo aver tolto gli spazi, altrimenti il round è rifiutato come input non valido con il campo indicato, prima di accodare o mostrare nulla;
- le richieste senza questi campi restano valide come prima;
- i due campi viaggiano sul canale locale fino all'host dell'editor insieme al resto del round;
- la forma del risultato non cambia.
