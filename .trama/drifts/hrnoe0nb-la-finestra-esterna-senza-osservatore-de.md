---
status: resolved
resolution: fix-code
refs:
  - agent-terminal/No agent terminal/developer.ASK_AGENT
  - requirements/rules#agent-terminal
  - requirements/quality#agent-terminal
  - requirements/ui#agent-terminal
proposal: null
task: 4t7irx9o
origin: null
option: 1
note: null
created: 2026-10-06T15:48:59.922Z
---
# La finestra esterna senza osservatore dei marcatori dà un errore generico e non copia l'istruzione

## What happens

Se all'avvio dell'editor Trama non è riuscito a osservare la cartella dei **marcatori di fine** (il developer ha visto solo un errore in quel momento), ogni istruzione successiva con il launcher «external-terminal» si ferma prima di aprire la finestra con un errore generico «Trama: The external terminal's end markers are not being watched.».

- L'istruzione **non va negli appunti**.
- Il messaggio non è quello previsto per una finestra che non si può aprire.
- Per la scansione dopo l'unione di un giro di worktree l'errore non è mostrato affatto: l'avvio fallisce in silenzio.

## What should happen

Ogni errore nell'aprire o riusare una finestra esterna è catturato e mostrato come descritto in `ui`: non parte nulla, l'istruzione va negli appunti e il developer legge «Trama could not open an external terminal: <reason>. The instruction was copied to the clipboard.». Non c'è mai un fallimento silenzioso, e la Machine non cambia State.

## Fix options

### Trattarlo come finestra che non si apre

Quando i marcatori non sono osservati, il launcher esterno si comporta come per ogni altra finestra che non si può aprire: istruzione negli appunti e messaggio d'errore previsto, con il motivo. Nessun annuncio e nessun invio segnato. Costo minimo: un controllo in più prima di aprire la finestra; vale per bottoni, scansione automatica e scansione dopo l'unione.

### Riprovare a osservare la cartella al momento dell'invio

Prima di aprire la finestra Trama prova di nuovo a creare e osservare la cartella dei marcatori; solo se fallisce ancora ripiega sugli appunti con il messaggio previsto. Recupera i casi transitori (cartella rimossa, risorse esaurite all'avvio) ma aggiunge un percorso in più da mantenere.

## Where in the code

extension/src/host/agent.ts: `startExternalRun` (lancia l'errore), `launchExternal`, `reuseExternalWindow`, `reportRoundMerge` (`void launchAgent` senza gestione dell'errore); extension/src/host/main.ts: `watchExternalRuns` all'avvio
