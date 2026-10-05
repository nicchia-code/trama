---
column: done
technical: false
refs:
  - panel/Board
  - requirements/rules#task
  - requirements/tech#panel
drift: null
proposal: e87cbe8e
agent: false
created: 1970-01-01T00:00:00.130Z
---
# Togliere dai messaggi tra Board e host le richieste di spostare e riprendere un Task

L'host dell'editor non accetta alcuna richiesta di spostare un Task né di riprenderlo dall'agente, e la Board non ne manda: questi due messaggi non esistono più e un messaggio di quel tipo viene rifiutato come sconosciuto. Restano i messaggi di avvio dell'agente (eseguire un Task, tutti i Task in To do, un design), le decisioni su Proposal e Drift e l'apertura dei link. Spostare un Task e riprenderlo restano nella riga di comando, che il pannello non incapsula.
