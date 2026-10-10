---
status: resolved
resolution: fix-code
refs:
  - drift-resolution/Running tasks/cursor-chat.AGENT_STOPPED
  - drift-resolution/Resolving/cursor-chat.AGENT_STOPPED
  - requirements/rules#drift-resolution
proposal: null
task: uhhhszyg
origin: null
option: 1
note: null
resolvedBy: y52ae3pw
created: 2026-10-09T22:10:31.732Z
---
# A Cursor chat job can miss the conversation its send started

## What happens

Con la chat di Cursor, un Run o Resolve Drifts si lega al **primo prompt di una qualunque conversazione di Trama** che arriva mentre il lavoro non ha ancora una conversazione, non alla conversazione che parte subito dopo il suo invio.

- Un prompt successivo in una conversazione già avviata, o già legata a un altro lavoro, si prende il lavoro: questo finisce con la fine di turno di quella conversazione mentre il suo agente lavora ancora, e l'esclusione fra Run e Resolve Drifts cade.
- Se il primo prompt della sua conversazione arriva all'editor prima che il lavoro sia registrato, il lavoro resta **senza conversazione**: per la chat di Cursor non vale la quiete, quindi non finisce più e Resolve Drifts (o i Run) restano bloccati fino alla riapertura dell'editor.

## What should happen

Un lavoro nella chat di Cursor è legato alla **conversazione di Trama che parte subito dopo il suo invio**, e finisce solo con la fine di turno, l'interruzione o la chiusura di quella; la fine di un'altra conversazione di Trama, anche di un altro lavoro, non conta (`rules#drift-resolution`).

Running tasks torna in Free alla fine della conversazione dell'ultimo Run ancora in corso, Resolving alla fine della conversazione di Resolve Drifts: un lavoro inviato deve sempre poter finire con la sua conversazione.

## Fix options

### Bind only a new conversation, whatever the order

Il lavoro prende solo una conversazione di Trama al suo primo prompt e mai una già vista o già legata; un primo prompt arrivato poco prima che il lavoro sia registrato resta in attesa e viene preso appena il lavoro c'è. Allinea il codice al Model e a `rules#drift-resolution` senza cambiarli. Costo: ricordare per poco le conversazioni appena nate e quali sono già state viste.

### Register the job before the chat sends

Il lavoro si registra subito prima dell'invio alla chat e si scarta se la chat non lo manda da sola; così il primo prompt della sua conversazione lo trova sempre, e si legano solo conversazioni nuove. Costo: per un attimo il lavoro esiste prima dell'invio, contro la lettera di `rules#drift-resolution`, che va ritoccato; un invio fallito deve togliere il lavoro.

### Let quiet end an unbound Cursor job

Si tiene il legame di oggi, limitato alle conversazioni nuove, e si aggiunge la quiete di quindici minuti a un lavoro della chat di Cursor che non ha ancora una conversazione, così non resta mai bloccato. Costo: cambiare `rules#drift-resolution` e il Model, che oggi escludono la quiete per Cursor; un lavoro mal legato può ancora finire troppo presto.

## Where in the code

`extension/src/host/drift-resolution.ts` (`bindChatJob`, `endQuietJobs`); `extension/src/host/agent.ts` (`launchAgent`, ramo della chat, e `watchAgentTerminal`, `PROMPT_SUBMITTED`); `src/core/cursor-chat.ts` (`CursorConversations.translate`); `src/core/question-channel.ts` (`sendCursorHook`, che aspetta l'editor prima di rispondere a Cursor).
