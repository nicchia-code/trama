---
status: resolved
resolution: fix-code
refs:
  - requirements/quality#agent-launching
  - requirements/tech#agent-terminal
proposal: null
task: b7nnzlix
origin: null
option: 1
note: null
created: 2026-10-08T05:40:17.473Z
---
# Project settings can choose the agent command

## What happens

Il comando dell'agente personalizzato si legge con la precedenza normale delle impostazioni dell'editor, quindi anche dalle **impostazioni del workspace** di un progetto, che possono stare nel repository.

- Se il developer non ha scelto un agente del terminale, il comando del progetto rende l'agente effettivo `custom`: la scelta dell'agente non compare e al primo pulsante parte il programma scritto dal progetto.
- Se il developer ha scelto `custom`, il comando del progetto vince sul suo.
- Lo stesso comando parte anche da solo con la **scansione automatica** dopo un'approvazione, senza chiedere nulla.

## What should happen

Il programma che Trama esegue lo sceglie solo il developer: l'agente del terminale e i ruoli dei modelli si leggono solo dalle impostazioni utente, *così il file di un repository clonato non può cambiare il programma o le opzioni che Trama esegue*.

Un repository clonato non dovrebbe poter decidere quale comando parte nel terminale dell'agente, né farlo partire da solo dopo un'approvazione.

## Fix options

### Agent command only from user settings

Il comando personalizzato si legge solo dalle impostazioni utente, come l'agente del terminale e il launcher; un valore del workspace non conta più. Il Requisito di sicurezza vale per tutto ciò che sceglie il programma. Costo: chi oggi imposta un comando per un solo progetto (anche le prove manuali che lo scrivono nel workspace) deve spostarlo nelle impostazioni utente; la descrizione dell'impostazione va aggiornata.

### Allow a per-project command in the Requirements

Si tiene il codice e si scrive nei Requisiti che il comando personalizzato può venire dal progetto, a differenza dell'agente scelto. Nessuna modifica al codice, ma un repository clonato può far eseguire il suo comando, anche da solo dopo un'approvazione, a chi non ha scelto un agente.

### Project command only after confirmation

Il comando del workspace vale solo dopo che il developer lo conferma una volta per quel progetto; fino ad allora si comporta come se non ci fosse (compare la scelta dell'agente e la scansione automatica non parte). Serve un avviso nuovo nel Modello e nei Requisiti; è la via più costosa da costruire.

## Where in the code

`extension/package.json`: `trama.agentCommand` non ha `scope: "application"`, a differenza di `trama.terminalAgent`, dei ruoli e di `trama.agentLauncher`. `extension/src/host/agent.ts`: `configuredAgentCommand()` lo legge da `vscode.workspace.getConfiguration`, e `configuredTerminalAgent()` / `agentReady()` ne deducono l'agente `custom` e il via libera alla scansione automatica.
