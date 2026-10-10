---
status: resolved
resolution: fix-code
refs:
  - agent-terminal/Agent idle/developer.ASK_AGENT
  - requirements/tech#agent-terminal
proposal: null
task: yrwqzdvz
origin: null
option: 1
note: null
resolvedBy: vgoluaem
created: 2026-10-10T10:22:11.774Z
---
# Reused external window runs the agent outside the project folder

## What happens

Quando Trama riusa una **finestra esterna libera**, scrive il comando dell'agente nella shell rimasta aperta e lo esegue nella cartella in cui quella shell si trova in quel momento.

Se dopo la corsa precedente il developer ha cambiato cartella nella finestra (per leggere un file o lanciare un test), l'agente nuovo parte **fuori dalla cartella del progetto**: i percorsi relativi dell'istruzione e il lavoro dell'agente puntano altrove. Con Terminal.app la finestra nuova entra esplicitamente nella cartella del progetto e quella riusata no, quindi le due righe non sono nemmeno uguali.

## What should happen

Ogni corsa dell'agente in una finestra esterna parte **nella cartella del progetto**, sia in una finestra nuova sia in una riusata.

Il Requisito dice che il processo parte nella cartella del progetto e che la riga scritta nella finestra riusata è la stessa di una finestra nuova, con la stessa identità e un numero di corsa nuovo. Il developer può usare la finestra libera come vuole senza cambiare dove lavorerà l'agente la volta dopo.

## Fix options

### Entrare nella cartella del progetto in ogni corsa

La riga che gira nella finestra, nuova o riusata, entra prima nella cartella del progetto e poi avvia l'agente. Così la riga è davvero la stessa nei due casi e l'agente lavora sempre nel progetto, qualunque cosa il developer abbia fatto nella finestra libera. Costo minimo: un passo in più nella riga; se la cartella non esiste più, la corsa finisce subito con un errore visibile e il marcatore arriva lo stesso.

### Riusare solo una finestra rimasta nel progetto

Prima del riuso Trama chiede al terminale in quale cartella si trova la shell della finestra; se non è la cartella del progetto apre una finestra nuova senza avvisi. Il developer non vede mai l'agente partire altrove, ma ottiene più finestre. Costo: serve un modo affidabile di leggere la cartella corrente per Terminal.app, kitty e WezTerm, con più scripting e più casi di errore da gestire.

### Dichiarare il comportamento nel Modello

Modello e Requisiti dicono che una finestra riusata esegue l'agente nella cartella corrente della sua shell, e che il developer non deve spostarsi se vuole che l'agente lavori nel progetto. Nessun cambio al codice, ma l'agente può lavorare nella cartella sbagliata senza che nessuno se ne accorga, anche nella scansione automatica dopo un'approvazione.

## Where in the code

extension/src/host/agent.ts (`reuseExternalWindow`, `startExternalRun`); extension/src/host/external-terminal.ts (`externalScript`); extension/src/host/external-open.ts (`openWindow`, ramo Terminal.app che aggiunge l'ingresso nella cartella solo alla finestra nuova)
