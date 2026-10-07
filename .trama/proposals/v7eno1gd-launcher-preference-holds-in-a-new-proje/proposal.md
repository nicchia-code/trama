---
status: approved
base:
  agent-launching/agent-terminal.md: be3e58a5d253ecbf4e4e33eef63217d0c50d28db33a1a56a452e1074ef75b3c5
  requirements/rules/agent-terminal.md: b925576c732fc9837458ae7fe271aea15de0f2bc7eed2e4eea3279574bb1fdc5
delete: []
created: 2026-10-07T20:21:18.077Z
scanScope:
  - ref: agent-terminal
    reason: changed
  - ref: requirements/rules#agent-terminal
    reason: changed
---
# Launcher preference holds in a new project

Bug segnalato dal developer: in un progetto nuovo, Import from Code ha aperto la chat di Cursor anche se trama.agentLauncher era 'terminal'. Il Modello diceva già che il launcher scelto a mano vince sempre, ma non nominava il caso del progetto appena inizializzato; il sorgente passa design, scan e import per lo stesso punto e non mostra un ramo che spieghi il bug, quindi la scansione dopo l'approvazione deve cercarlo sul campo.

Decisioni:
- Rendere esplicito nel Modello e in rules che il launcher scelto vale anche in un progetto nuovo (scelta del developer).
- Assunzione (domanda saltata, raccomandazione): la regola vale per ogni istruzione, non solo per l'import.
- Assunzione (domanda saltata): il caso tipico è l'import dalla palette in una finestra in cui il pannello Trama non è mai stato aperto; la regola copre anche il pannello aperto e il momento subito dopo l'inizializzazione.
