---
status: resolved
resolution: proposal
refs:
  - drift-resolution/Resolving/agent-hook.IDLE
  - drift-resolution/Resolving/terminal.COMMAND_ENDED
  - drift-resolution/Resolving/editor-chat.AGENT_STOPPED
  - drift-resolution/In attesa delle scansioni
proposal: null
task: null
origin: null
critical: false
option: null
note: null
resolvedBy: a46tgzxd
created: 2026-10-14T14:45:56.072Z
---
# Automatic Run starts while a scan is still running

## What happens

Quando l'agente della risoluzione finisce, il Run automatico parte subito anche se uno scan avviato dopo la raccolta è ancora in corso: il Run non aspetta quello scan.

## What should happen

Il Model dice che la risoluzione termina senza Run automatico quando uno scan successivo è ancora in corso: la delega resta in attesa, e il Run parte solo quando tutti gli scan sono finiti.

## Fix options

### Wait for the scans before the automatic Run

Il Run automatico parte solo quando non c'è più nessuno scan in corso. Le correzioni arrivano qualche minuto dopo la fine dello scan, ma il comportamento corrisponde al Model senza altri cambiamenti.

### Start the Run with the scan running and update the Model

Il Run parte appena l'agente di risoluzione finisce, come oggi nel codice. Il Model va corretto perché dica che uno scan avviato dopo la raccolta non trattiene il Run; il divieto di interrompere il Run resta valido. Costo: transizioni del Model cambiate.

## Where in the code

extension/src/host/controller.ts, startAuthorizedRun: il Run è bloccato solo da Run e risoluzioni attive, gli scan no.
