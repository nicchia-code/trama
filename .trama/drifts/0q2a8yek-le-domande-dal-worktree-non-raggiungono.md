---
status: resolved
resolution: fix-code
refs:
  - question-round/Not asked
  - requirements/tech#question-round
proposal: null
task: h5x4mof6
origin: null
option: 1
note: null
created: 2026-10-06T20:36:56.000Z
---
# Le domande dal worktree non raggiungono la finestra che ha avviato l’agente

## What happens

Un agente avviato da Trama nel worktree di una Proposal o nel worktree di merge riceve il collegamento alla finestra del progetto principale. Quando chiede un round dalla propria cartella, però, quella finestra è considerata appartenente a un progetto diverso: la richiesta restituisce **editor non disponibile**, senza presentare le domande. La stessa richiesta dalla cartella principale raggiunge correttamente il canale. La differenza è stata riprodotta con un server locale reale e lo stesso collegamento per le due cartelle.

## What should happen

Le domande di un agente avviato in un terminale Trama devono raggiungere **la finestra che lo ha avviato**, anche quando il suo lavoro si svolge in un worktree del giro. Se quella finestra è disponibile, il round deve entrare in Asking o Queued secondo la presenza di un altro round, non in Unanswered per la sola differenza fra la cartella principale e quella del worktree. La correzione deve mantenere la separazione fra progetti estranei e le regole di indisponibilità e interruzione reali.

## Fix options

### Riconoscere i worktree del giro nella finestra di origine

La finestra che ha avviato il terminale accoglie anche le domande dei worktree appartenenti al suo giro, mantenendo le richieste ancorate alla cartella in cui l’agente lavora. I progetti estranei restano esclusi. Occorre verificare questa appartenenza durante la connessione e conservarla quando un worktree entra nel giro o ne esce; il developer continua a rispondere nella stessa finestra senza cambiare il proprio flusso.

### Instradare esplicitamente le domande al progetto principale

Il terminale del worktree conserva esplicitamente il progetto della finestra di origine come destinazione delle sole domande. L’agente continua a lavorare nella propria cartella, ma il round viene richiesto per il progetto principale ed entra nella sua coda. Occorre propagare questa destinazione lungo tutte le richieste del terminale, senza cambiare la cartella usata dagli altri comandi e senza inviare domande a finestre di progetti estranei.

## Where in the code

extension/src/host/agent.ts: openWorktreeTerminal e sendWorktreeInstruction; extension/src/host/questions.ts: questionEndpoint e WindowQuestions; src/core/question-channel.ts: questionProjectId, askEditor, connectEditor e createQuestionServer.
