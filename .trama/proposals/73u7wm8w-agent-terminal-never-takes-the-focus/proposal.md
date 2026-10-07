---
status: approved
base:
  agent-launching/agent-terminal.md: ab1e8298de4262d410914a82f5257684b7b215439bfa5d902539dae3140d09c9
  requirements/ui/agent-terminal.md: new
  requirements/tech/agent-terminal.md: b5920c40e0e826ab5315088620ad68db1f46a1762d6b8eae3906154feb7b74e2
  requirements/ui/agents.md: 657cd42aef1905285e5218ee5faa43bc1517fdbe97c35101f55ea7023eb07c14
delete: []
request: 2026-10-07T07-27-02
created: 2026-10-07T05:30:23.422Z
scanScope:
  - ref: agent-terminal
    reason: changed
  - ref: requirements/tech#agent-terminal
    reason: changed
  - ref: requirements/ui#agent-terminal
    reason: changed
---
# Agent terminal never takes the focus

Dopo un pulsante o un'approvazione il focus finiva nel terminale integrato appena aperto, interrompendo quello che il developer stava facendo.

Decisioni:
- Vale per ogni avvio di un terminale integrato dell'agente: pulsanti Design, Scan, Implement, Implement all, Import, rifacimento di una Proposal obsoleta, scansione automatica dopo un'approvazione, «Scan now» e Hold scan spento.
- Il terminale nell'area dei terminali (launcher «terminal» e «auto» fuori da Cursor) parte senza mostrarsi: l'area dei terminali non si apre e non cambia terminale visibile; il developer lo apre a mano quando vuole.
- Con «terminal-tab» nulla cambia: la scheda si porta in primo piano nel suo gruppo accanto, senza focus, e la scheda che il developer sta guardando resta quella.
- La finestra del terminale esterno è fuori da questa modifica: il suo focus lo decide il sistema.
- Il launcher della chat non cambia.
