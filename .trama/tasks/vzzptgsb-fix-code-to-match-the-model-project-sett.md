---
column: done
technical: false
refs:
  - agent-terminal
  - requirements/rules#agent-terminal
drift: qh5rt4en
proposal: null
agent: false
created: 2026-10-07T20:30:50.647Z
finished: 2026-10-07T20:31:26.544Z
---
# Fix code to match the Model: Project settings override the developer's launcher

## What happens

Il launcher è letto con la precedenza normale delle impostazioni dell'editor, quindi le **impostazioni del workspace** di un progetto vincono sulla scelta del developer. Un progetto può così portare un launcher suo, anche dentro il repository.

È il caso trovato sul campo: un progetto appena inizializzato ha nelle impostazioni del workspace, già nel repository, il launcher `chat`; il developer ha scelto un launcher del terminale nelle sue impostazioni utente, ma Import from Code (e ogni altra istruzione) in quel progetto va alla chat di Cursor.

## What should happen

Il launcher scelto dal developer vale per ogni istruzione e **in ogni progetto**, anche appena inizializzato: un progetto nuovo non ha un launcher suo. Con `terminal`, `terminal-tab` o `external-terminal` nessuna istruzione, import compreso, va mai alla chat; solo `chat`, o `auto` in Cursor, la porta lì.

## Chosen option

**Launcher only from user settings**

Il launcher si legge solo dalle impostazioni utente, come già l'agente del terminale e i ruoli dei modelli: un valore nelle impostazioni del workspace o della cartella non conta più. Il comportamento segue il Modello in ogni progetto. Costo: chi oggi sceglie il launcher per un singolo progetto perde questa possibilità; la descrizione dell'impostazione va aggiornata.

## Where in the code

`extension/src/host/agent.ts`, `agentLauncher()`: legge `trama.agentLauncher` da `vscode.workspace.getConfiguration` senza limitarsi al valore utente; `extension/package.json`: `trama.agentLauncher` non ha `scope: "application"`, a differenza di `trama.terminalAgent`. Prova sul campo: `~/Developer/MagicBuilder/.vscode/settings.json` (nel repository) contiene `"trama.agentLauncher": "chat"`, mentre le impostazioni utente di Cursor hanno un launcher del terminale.
