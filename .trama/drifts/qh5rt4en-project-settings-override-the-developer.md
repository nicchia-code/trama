---
status: resolved
resolution: fix-code
refs:
  - agent-terminal
  - requirements/rules#agent-terminal
proposal: null
task: vzzptgsb
origin: null
option: 1
note: null
created: 2026-10-07T20:26:38.238Z
---
# Project settings override the developer's launcher

## What happens

Il launcher è letto con la precedenza normale delle impostazioni dell'editor, quindi le **impostazioni del workspace** di un progetto vincono sulla scelta del developer. Un progetto può così portare un launcher suo, anche dentro il repository.

È il caso trovato sul campo: un progetto appena inizializzato ha nelle impostazioni del workspace, già nel repository, il launcher `chat`; il developer ha scelto un launcher del terminale nelle sue impostazioni utente, ma Import from Code (e ogni altra istruzione) in quel progetto va alla chat di Cursor.

## What should happen

Il launcher scelto dal developer vale per ogni istruzione e **in ogni progetto**, anche appena inizializzato: un progetto nuovo non ha un launcher suo. Con `terminal`, `terminal-tab` o `external-terminal` nessuna istruzione, import compreso, va mai alla chat; solo `chat`, o `auto` in Cursor, la porta lì.

## Fix options

### Launcher only from user settings

Il launcher si legge solo dalle impostazioni utente, come già l'agente del terminale e i ruoli dei modelli: un valore nelle impostazioni del workspace o della cartella non conta più. Il comportamento segue il Modello in ogni progetto. Costo: chi oggi sceglie il launcher per un singolo progetto perde questa possibilità; la descrizione dell'impostazione va aggiornata.

### Model allows a per-project launcher

Si tiene il codice e si cambia il Modello: le impostazioni del workspace possono scegliere il launcher di un progetto e vincono su quelle utente. Nessuna modifica al codice, ma un repository clonato può decidere dove va l'istruzione e il caso segnalato resta il comportamento voluto.

### Warn when the project overrides it

Si tiene la precedenza dell'editor ma, quando il workspace sceglie un launcher diverso da quello delle impostazioni utente, il developer è avvisato al primo invio. Il Modello va ampliato con l'avviso; l'istruzione continua ad andare dove dice il progetto.

## Where in the code

`extension/src/host/agent.ts`, `agentLauncher()`: legge `trama.agentLauncher` da `vscode.workspace.getConfiguration` senza limitarsi al valore utente; `extension/package.json`: `trama.agentLauncher` non ha `scope: "application"`, a differenza di `trama.terminalAgent`. Prova sul campo: `~/Developer/MagicBuilder/.vscode/settings.json` (nel repository) contiene `"trama.agentLauncher": "chat"`, mentre le impostazioni utente di Cursor hanno un launcher del terminale.
