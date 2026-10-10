---
status: resolved
resolution: fix-code
refs:
  - drift-resolution/Running tasks/time.QUIET_PERIOD_ELAPSED
  - drift-resolution/Resolving/time.QUIET_PERIOD_ELAPSED
  - drift-resolution/Running tasks/cursor-chat.AGENT_STOPPED
  - requirements/rules#drift-resolution
proposal: null
task: gbzolqfu
origin: null
option: 1
note: null
resolvedBy: s1fhgqej
created: 2026-10-10T09:19:26.551Z
---
# A Cursor chat job whose conversation is never seen never ends

## What happens

Con la chat di Cursor, un Run o Resolve Drifts inviato finisce **solo** con un evento della conversazione a cui si è legato. Se Trama non vede mai quella conversazione, il lavoro resta **senza conversazione e non finisce più**: per la chat di Cursor la quiete non vale.

Succede quando il primo prompt arriva più di dieci secondi prima che il lavoro sia registrato, quando il turno finisce prima della registrazione, quando l'hook di Cursor rinuncia dopo un secondo, quando gli hook non sono installati (file degli hook non valido) o quando Cursor non invia davvero l'istruzione.

Running tasks o Resolving restano allora fino alla riapertura dell'editor: Resolve Drifts, o tutti i Run, restano disabilitati.

## What should happen

Il Model dice che per un lavoro di cui Trama **non può vedere la fine con certezza** vale anche la quiete (`time.QUIET_PERIOD_ELAPSED` → Free), e che ogni lavoro inviato finisce. `rules#drift-resolution` però limita la quiete all'elenco chiuso (finestra esterna, terminale senza fine dei comandi, agente con hook, chat che non è di Cursor) e nessun Event del Model copre un lavoro di Cursor la cui conversazione non arriva mai.

Il Drift c2syujpg (risolto) correggeva solo l'ordine fra prompt e registrazione, entro un tempo breve.

## Fix options

### Quiet until the conversation is bound

Un lavoro della chat di Cursor è trattato come un terminale che non ha ancora segnalato l'inizio del comando: finché non è legato alla sua conversazione vale la quiete di quindici minuti, contata sui comandi dell'agente della chat di Cursor; dal legame in poi lo finisce solo la sua conversazione. Costo: ritoccare `rules#drift-resolution` e il testo del Model, poche righe di codice. Era l'opzione 3 di c2syujpg, allora non scelta.

### Keep new conversations waiting until a job takes them

Si toglie il limite di dieci secondi: una conversazione di Trama nata dopo l'invio resta in attesa finché un lavoro non la prende, e una che finisce prima della registrazione chiude il lavoro appena registrato. Solo codice, nessun cambio al Model. Costo: copre solo i ritardi di registrazione, non un hook perso, hook non installati o un invio che Cursor non fa.

### Let the developer stop following a stuck job

Il pulsante disabilitato offre di smettere di seguire il lavoro in chat: il developer, che vede la chat ferma, riporta Drift resolution in Free. Copre ogni caso senza indovinare tempi. Costo: un Event nuovo del developer e una Transition in Running tasks e Resolving, più testo e accessibilità del pulsante.

### Accept the limit and state it

Si tiene il comportamento di oggi e il Model e `rules#drift-resolution` dicono che un lavoro di Cursor la cui conversazione non arriva resta in corso fino alla riapertura dell'editor. Nessun lavoro sul codice. Costo: Run e Resolve Drifts possono restare bloccati senza che il developer sappia perché.

## Where in the code

`extension/src/host/drift-resolution.ts` (`startJob`, `takePendingChat` and its ten-second window, `endChatJobs`, `endQuietJobs`); `extension/src/host/agent.ts` (`launchAgent`, chat branch passing Cursor as an end that is always visible); `extension/src/host/cursor.ts` (`openCursorChat`, which reports `sent` whatever Cursor does).
