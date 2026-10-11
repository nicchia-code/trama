---
column: done
technical: false
refs:
  - agent-terminal
  - requirements/rules#agent-launching
  - requirements/tech#agent-launching
  - requirements/tech#agent-terminal
drift: null
proposal: dtpkqiid
agent: false
created: 2026-10-11T08:38:04.232Z
finished: 2026-10-11T08:41:44.147Z
---
# Start Cursor's chat conversation on the model of the run's role

Quando un'istruzione va alla chat di Cursor e il ruolo del lavoro (analisi per design, import e Resolve Drifts; scansione per le scansioni; esecuzione per i Task) non è vuoto, la conversazione nuova che Trama crea parte su quel modello, con la modalità Max spenta; con il ruolo vuoto parte come oggi, senza modello. Il modello vale solo per quella conversazione: la scelta del developer per le altre conversazioni non cambia. Solo il primo passo della consegna (la creazione della chat che si invia da sola) porta il modello: se l'istruzione ripiega sul deeplink o sugli appunti parte senza modello e senza altri avvisi. Il ruolo del lavoro è quello che già usano i terminali, spazi attorno tolti. Oggi la chat non riceve nessun modello.
