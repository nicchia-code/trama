---
column: done
technical: false
refs:
  - agent-terminal
  - requirements/tech#agent-terminal
  - requirements/ui#agent-terminal
drift: null
proposal: nbxcf29d
agent: false
created: 2026-10-17T07:25:03.365Z
finished: 2026-10-17T07:30:33.868Z
---
# Aprire la scheda del terminale nel gruppo attivo

Con `trama.terminalLocation` su `editor`, quando Trama apre il terminale dell'agente la scheda si affianca alle schede già aperte nel gruppo attivo, come ultima scheda, e Trama non crea mai un gruppo nuovo né sposta le altre schede. Ogni scheda nuova va nel gruppo attivo del momento in cui Trama la apre, anche se una scheda precedente dell'agente è ancora aperta in un altro gruppo: Trama non ricorda più il gruppo della scheda precedente.

Quando Trama apre la scheda, la porta in primo piano nel gruppo, anche sopra il pannello Trama se il pannello sta in quel gruppo, ma non le dà il focus: cursore e tastiera restano dove erano. Tutto il resto del terminale in scheda (nome, fine del comando, hook, chiusura, Task presi, annunci) resta com'è.

Il terminale si crea con `location: { viewColumn: vscode.ViewColumn.Active, preserveFocus: true }`, sempre, seguito da `terminal.show(true)`; spariscono l'uso di `vscode.ViewColumn.Beside`, la memoria della colonna della scheda precedente e l'ascolto di `vscode.window.tabGroups.onDidChangeTabs` che serviva a trovarla. La descrizione del valore `editor` di `trama.terminalLocation` è «a terminal tab in the active editor group», nella `markdownDescription` e nelle `enumDescriptions` del manifest; la README dell'estensione dice lo stesso al posto di «beside the active editor».
