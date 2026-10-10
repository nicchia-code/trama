---
column: done
technical: false
refs:
  - drift-resolution/Running tasks/time.QUIET_PERIOD_ELAPSED
  - drift-resolution/Resolving/time.QUIET_PERIOD_ELAPSED
  - drift-resolution/Running tasks/cursor-chat.AGENT_STOPPED
  - requirements/rules#drift-resolution
drift: cydzmlpy
proposal: null
agent: false
created: 2026-10-10T09:44:58.493Z
finished: 2026-10-10T09:49:15.905Z
---
# Fix code to match the Model: A Cursor chat job whose conversation is never seen never ends

## What happens

Con la chat di Cursor, un Run o Resolve Drifts inviato finisce **solo** con un evento della conversazione a cui si è legato. Se Trama non vede mai quella conversazione, il lavoro resta **senza conversazione e non finisce più**: per la chat di Cursor la quiete non vale.

Succede quando il primo prompt arriva più di dieci secondi prima che il lavoro sia registrato, quando il turno finisce prima della registrazione, quando l'hook di Cursor rinuncia dopo un secondo, quando gli hook non sono installati (file degli hook non valido) o quando Cursor non invia davvero l'istruzione.

Running tasks o Resolving restano allora fino alla riapertura dell'editor: Resolve Drifts, o tutti i Run, restano disabilitati.

## What should happen

Il Model dice che per un lavoro di cui Trama **non può vedere la fine con certezza** vale anche la quiete (`time.QUIET_PERIOD_ELAPSED` → Free), e che ogni lavoro inviato finisce. `rules#drift-resolution` però limita la quiete all'elenco chiuso (finestra esterna, terminale senza fine dei comandi, agente con hook, chat che non è di Cursor) e nessun Event del Model copre un lavoro di Cursor la cui conversazione non arriva mai.

Il Drift c2syujpg (risolto) correggeva solo l'ordine fra prompt e registrazione, entro un tempo breve.

## Chosen option

**Quiet until the conversation is bound**

Un lavoro della chat di Cursor è trattato come un terminale che non ha ancora segnalato l'inizio del comando: finché non è legato alla sua conversazione vale la quiete di quindici minuti, contata sui comandi dell'agente della chat di Cursor; dal legame in poi lo finisce solo la sua conversazione. Costo: ritoccare `rules#drift-resolution` e il testo del Model, poche righe di codice. Era l'opzione 3 di c2syujpg, allora non scelta.

## Where in the code

`extension/src/host/drift-resolution.ts` (`startJob`, `takePendingChat` and its ten-second window, `endChatJobs`, `endQuietJobs`); `extension/src/host/agent.ts` (`launchAgent`, chat branch passing Cursor as an end that is always visible); `extension/src/host/cursor.ts` (`openCursorChat`, which reports `sent` whatever Cursor does).
