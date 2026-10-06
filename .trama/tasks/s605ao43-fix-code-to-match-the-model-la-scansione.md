---
column: done
technical: false
refs:
  - agent-terminal/No agent terminal
  - agent-terminal/Agent idle
  - agent-terminal/Agent running
  - worktree-round.MERGED
drift: q4hsd1x8
proposal: null
agent: false
created: 2026-10-06T14:27:59.695Z
---
# Fix code to match the Model: La scansione dopo l'unione di un giro parte nel terminale dell'agente senza una Transition nel Model

## What happens

Quando un **giro di worktree si unisce** alla cartella aperta (anche quando un'unione in attesa viene applicata più tardi), Trama manda l'istruzione di scansione delle Feature toccate al launcher abituale: con un launcher del terminale apre o riusa il terminale dell'agente chiamato `Scan`, che passa così ad *Agent running*.

Nel Diagram di agent-terminal questo passaggio non c'è: la Machine non reagisce a `worktree-round.MERGED`.

## What should happen

Il Diagram di agent-terminal fa partire l'agente solo con `developer.ASK_AGENT` e `proposal.APPROVED`, e dice che un'approvazione che arriva dall'unione di un giro **non** avvia nulla.

Il Requisito di worktree-round e la descrizione di `worktree-round.MERGED` dicono invece che dopo l'unione parte una sola scansione dell'unione delle Feature, "con il launcher abituale nella cartella aperta". Il Model descrive quindi il comportamento ma non lo disegna nella Machine che lo esegue.

## Chosen option

**Aggiungere la Transition al Model**

Una Proposal aggiunge a agent-terminal una Transition su `worktree-round.MERGED` da ciascuno dei tre State verso *Agent running*, con le stesse regole di riuso del terminale e il nome `Scan`, solo con un launcher del terminale e se almeno una Feature è toccata. Il codice resta com'è; costa solo il lavoro sul Model.

## Where in the code

extension/src/host/agent.ts, `reportRoundMerge` (chiamata dalla fine dei terminali dei worktree e da `settleWaitingRound`)
