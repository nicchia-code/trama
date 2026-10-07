---
column: done
technical: false
refs:
  - agent-launching
  - agent-terminal
  - requirements/rules#agent-launching
  - requirements/tech#agent-launching
  - requirements/quality#agent-launching
  - requirements/tech#agent-terminal
drift: null
proposal: w2cspsnx
agent: false
created: 2026-10-07T15:00:22.827Z
finished: 2026-10-07T15:06:34.381Z
---
# Start the chosen agent on the model of the run's role and give the scan's sub-agents their models

Quando è fatto, ogni comando che Trama scrive in un terminale avvia l'agente sul modello del ruolo del lavoro: analisi per design (rapida e scritta), rifacimento di una Proposal obsoleta e import; scansione per scansioni del System, di Feature, automatica e in sospeso; esecuzione per implement, implement all e implement a design.
- `omp`, `claude`, `codex`, `copilot -i` e `agent` hanno la riga di comando dei Requisiti `tech`, con `--model` solo se il ruolo non è vuoto e nomi citati per la shell;
- per le istruzioni che possono scansionare `omp` riceve `--smol`/`--slow` e `claude` riceve `--agents` con `trama-triage` e `trama-analysis`, ciascuno col suo modello solo se il ruolo non è vuoto;
- con `custom` ogni `{model}` di `trama.agentCommand` diventa il modello della corsa citato, o nulla con il ruolo vuoto;
- le istruzioni che possono scansionare portano, con un launcher del terminale, la frase dei sotto-agenti dei Requisiti `rules`, prima della frase della lingua; in chat mai.
