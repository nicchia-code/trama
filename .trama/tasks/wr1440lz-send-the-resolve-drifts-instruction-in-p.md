---
column: done
technical: false
refs:
  - agent-terminal/No agent terminal/developer.ASK_AGENT
  - agent-terminal/Agent running/developer.ASK_AGENT
  - agent-terminal/Agent idle/developer.ASK_AGENT
  - requirements/rules#agent-terminal
  - requirements/rules#agent-launching
  - requirements/tech#agent-launching
drift: null
proposal: hlnh5d44
agent: false
created: 2026-10-09T07:12:08.284Z
finished: 2026-10-09T08:28:22.260Z
---
# Send the Resolve Drifts instruction in place of the stale Proposal rework

Quando il developer lancia Resolve Drifts, Trama invia all'agente l'istruzione di una riga "Use the trama-resolve-drifts skill on the open Drifts <id>, <id>, …: ask the developer what should happen for each one, then write one resolution Proposal.", con l'identità permanente di ogni Drift aperto al momento dell'invio, in ordine di creazione, seguita come ogni istruzione dalla frase della lingua quando è impostata.

Fatto quando:
- l'istruzione è rifiutata quando Resolve Drifts non si può usare (le condizioni sono quelle di `drift-resolution`);
- con i launcher del terminale il terminale si chiama `Drifts`, si riusa solo un terminale libero con lo stesso nome e l'agente parte sul modello di `trama.analysis`, senza frase dei sotto-agenti perché questa istruzione non scansiona (oggi un nome sconosciuto finirebbe sul ruolo di esecuzione);
- al lancio con un launcher del terminale, solo quando l'istruzione parte davvero, Trama annuncia una Proposal con il titolo esatto `Resolve Drifts`, come per una richiesta di design (origine richiesta, appartenente al terminale `Drifts` in cui è scritta l'istruzione), così la Board ne mostra subito il ghost; l'annuncio non è legato a nessun Drift e l'agente non ne riceve l'ID;
- il rifacimento della Proposal obsoleta di un Drift non ha più un'istruzione: sparisce la riga che chiedeva alla skill trama-design di riscrivere la Proposal allegata, l'azione di lancio che la inviava dal pannello e il suo annuncio legato al Drift. Il pulsante sulla scheda del Drift e il comando `trama drift replace-proposal` restano fuori da questo Task.
