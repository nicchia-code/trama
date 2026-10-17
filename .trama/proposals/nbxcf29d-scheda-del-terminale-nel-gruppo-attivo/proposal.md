---
status: approved
base:
  agent-launching/agent-terminal.md: 9157eb45a93541fbfcd6df5f10592b2786d6398ea86289067a11dd2fbb454597
  requirements/ui/agents.md: e8342eb332087ff09f8e2a4d8229c5d8cdae89a1a7e6db5d6a86515d8df2d32d
  requirements/tech/agent-terminal.md: a12196282f83a6237294e378e12a80bc324d7ae76b7f5f7a40ca54cf9d8b132c
delete: []
created: 2026-10-17T07:22:10.056Z
---
# Scheda del terminale nel gruppo attivo

Con `trama.terminalLocation` su `editor` la scheda del terminale dell'agente si apriva con `ViewColumn.Beside`, in un gruppo a destra che VS Code crea se non c'è. Il developer vuole che si affianchi alle schede già aperte invece di ancorarsi a destra.

Decisioni:
- La scheda si apre come nuova scheda nel gruppo attivo, accanto alle altre; Trama non crea mai un gruppo nuovo.
- La scheda nuova diventa quella visibile del suo gruppo, senza focus: cursore e tastiera restano dove erano. Se il pannello Trama è nel gruppo attivo, la scheda lo copre finché il developer non torna al pannello.
- Ogni scheda nuova segue la stessa regola al momento dell'apertura: Trama non ricorda più il gruppo della scheda precedente dell'agente.
- La descrizione di `editor` in `trama.terminalLocation` diventa «a terminal tab in the active editor group».
