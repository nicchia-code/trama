---
status: resolved
resolution: fix-code
refs:
  - agent-terminal
  - requirements/rules#agent-terminal
  - requirements/tech#agent-terminal
proposal: null
task: 374goew3
origin: null
option: 1
note: null
resolvedBy: 7jefoyuq
created: 2026-10-10T18:45:21.954Z
---
# Successful terminal scan still offers Scan now

## What happens

Con omp o Claude Code selezionato, dopo un’approvazione che richiede la scansione automatica Trama apre il terminale e invia regolarmente la scansione mirata. Subito dopo mostra comunque l’avviso della Proposal con **Scan now**, come se l’invio non fosse partito. Se il developer lo preme, apre un secondo terminale e invia di nuovo la stessa scansione: due agenti possono confrontare contemporaneamente lo stesso ambito e archiviare schede duplicate. Succede sia nell’area dei terminali sia in una scheda, per le approvazioni del pannello e quelle ricevute dalla riga di comando.

## What should happen

Una scansione automatica consegnata a omp o Claude Code deve partire una sola volta, senza offrire il recupero di una consegna già riuscita. L’avviso con **Scan now** serve quando la chat non invia da sola e la consegna deve attendere un gesto del developer, non quando il comando è già stato scritto nel terminale. Il ripiego Copilot negli appunti deve continuare a mostrare il pulsante; chiudere quell’avviso non deve avviare nulla e premerlo deve inviare la stessa scansione mirata.

## Fix options

### Recognize both successful delivery destinations

Considerare riuscita la consegna sia quando la chat invia da sola sia quando il terminale riceve il comando. Mostrare Scan now soltanto per una chat che non ha inviato il prompt. Non cambia il Modello né il recupero Copilot appena implementato; il costo è correggere la decisione comune dopo l’invio e coprire gli avvii automatici con entrambi gli agenti e le due posizioni del terminale.

### Confine scan recovery to chat delivery

Tenere separati gli esiti della chat e del terminale nel percorso della scansione dopo un’approvazione: soltanto gli esiti non inviati della chat possono mostrare l’avviso di recupero, mentre un terminale avviato termina quel percorso senza offrirlo. Il comportamento richiesto resta identico; il costo è rendere esplicita questa distinzione nell’orchestrazione delle approvazioni, mantenendo una sola istruzione mirata e la stessa catena di consegna per Scan now.

## Where in the code

extension/src/host/controller.ts: approvalOptions, scanApproved; extension/src/host/agent.ts: launchAgent, launched; test/host-agent-terminals.test.ts: an approval scan fallback offers Scan now
