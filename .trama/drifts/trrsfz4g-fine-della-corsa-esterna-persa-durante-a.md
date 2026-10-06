---
status: resolved
resolution: fix-code
refs:
  - agent-terminal/Agent running/terminal.COMMAND_ENDED
  - requirements/rules#agent-terminal
  - requirements/tech#agent-terminal
proposal: null
task: 7jg6lqha
origin: null
option: 1
note: null
created: 2026-10-06T18:49:49.476Z
---
# Fine della corsa esterna persa durante apertura fallita

## What happens

Se una nuova finestra esterna viene tentata mentre la precedente lavora ancora, la precedente smette di essere seguita prima che la nuova istruzione sia davvero inviata. Quando la corsa precedente finisce durante quel tentativo e la nuova finestra poi non si apre, i suoi Task sono rilasciati e i suoi annunci ritirati, ma la fine è trattata come quella di un terminale già sostituito: non nasce alcun avviso di fine comando. Lo scenario è riproducibile facendo arrivare il marcatore della corsa precedente prima che il tentativo fallito sia annullato.

## What should happen

Una finestra esterna che non si può aprire non invia nulla e non cambia lo State della Machine. La corsa precedente deve quindi restare quella seguita fino a un nuovo invio realmente riuscito. Se termina mentre il nuovo tentativo fallisce, la sua fine deve portare ad Agent idle, rilasciare i Task e ritirare gli annunci che le appartengono e, quando il developer ha configurato ntfy, far nascere il normale avviso di fine comando. Solo una nuova istruzione realmente inviata può sostituire quella corsa e sopprimere il suo avviso.

## Fix options

### Sostituire la corsa solo dopo invio riuscito

Continuare a seguire la corsa precedente mentre la nuova finestra si apre e sostituirla soltanto quando la nuova istruzione è stata davvero inviata. La nuova corsa può già raccogliere la propria fine in attesa della conferma, senza togliere alla precedente i suoi effetti. Un fallimento lascia intatto il comportamento precedente; richiede di distinguere il tentativo dalla corsa effettivamente seguita.

### Trattenere la fine precedente fino all’esito del tentativo

Se la corsa precedente finisce mentre la nuova finestra si apre, trattenere anche quella fine finché il tentativo ha un esito. Se il nuovo invio riesce, applicare soltanto il rilascio dei Task e il ritiro degli annunci; se fallisce, applicare la normale fine comando con il relativo avviso. Mantiene la preparazione anticipata della nuova corsa, ma richiede di conservare e consegnare correttamente entrambi gli esiti.

## Where in the code

extension/src/host/external-terminal.ts: ExternalRuns.start, ExternalRuns.take; extension/src/host/agent.ts: launchExternal, watchExternalRuns
