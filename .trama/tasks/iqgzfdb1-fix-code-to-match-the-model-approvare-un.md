---
column: done
technical: false
refs:
  - agent-terminal/No agent terminal
  - agent-terminal/Agent idle
  - agent-terminal/Agent running
  - proposal.APPROVED
drift: nbtk5zny
proposal: null
agent: false
created: 2026-10-06T14:28:09.443Z
---
# Fix code to match the Model: Approvare una Proposal dalla riga di comando non avvia la scansione automatica

## What happens

Con l'interruttore multi-branch spento (o illeggibile), `trama proposal approve` applica la Proposal ordinaria nella cartella aperta ma **non avvia mai la scansione automatica**, anche con l'editor aperto, `trama.autoScan` acceso e un comando dell'agente configurato. Lo stesso vale per `trama drift resolve --accept-proposal`.

La scansione parte solo quando l'approvazione avviene dal pannello dell'editor.

## What should happen

`proposal.APPROVED` è emesso ogni volta che una Proposal entra nel Model, e agent-terminal reagisce passando ad *Agent running* con la scansione di ciò che la Proposal ha cambiato, alle sole condizioni scritte nel Diagram: modifica ordinaria, non l'unione di un giro, scansione automatica accesa, agente avviabile senza domande e almeno una Feature toccata. Nessuna condizione esclude un'approvazione fatta dalla riga di comando.

## Chosen option

**Far avviare la scansione anche alle approvazioni da riga di comando**

Quando l'editor è aperto sul progetto, un'approvazione fatta da `trama proposal approve` o dalla risoluzione di un Drift con la sua Proposal fa partire la stessa scansione del pannello, per esempio passando dall'editor come già accade con l'interruttore acceso. A editor chiuso non parte nulla. Costa un passaggio in più tra comando ed editor.

## Where in the code

src/cli/commands.ts, comando `proposal approve` (strada `folder`); extension/src/host/controller.ts, `approveFromCommand` e `approving`; extension/src/host/approval.ts, `applyApprovedProposal`
