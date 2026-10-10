---
column: done
technical: false
refs:
  - proposal
  - proposal/Draft/agent.EDIT_PROPOSAL
  - proposal/Open/agent.EDIT_PROPOSAL
  - proposal.APPROVED
  - agent-terminal/No agent terminal/proposal.APPROVED
  - requirements/data#proposal
  - requirements/rules#proposal
  - requirements/rules#agent-terminal
  - requirements/tech#proposal
  - scan-hold/On/proposal.APPROVED
  - requirements/rules#scan-hold
drift: null
proposal: hlnh5d44
agent: false
created: 2026-10-09T07:11:49.925Z
finished: 2026-10-09T08:17:56.914Z
---
# Add resolution Proposals with Drift decisions

Una Proposal può essere una risoluzione di Drift. Oggi il tipo esiste solo come modifica o import: una Proposal con `kind: resolution` non si legge nemmeno, e non c'è modo di crearla né di registrarvi decisioni.

Quando è fatto:
- Una Proposal ha il tipo `resolution` oltre a `change` e `import`; una risoluzione porta nel front matter `drifts`, la lista ordinata delle decisioni (`drift`, `decision` fra `proposal`, `dismissed`, `fix-code`, `option` solo per `fix-code` su un Drift con opzioni, `note` solo per `fix-code` e assente se vuota), un Drift al più una volta; le altre Proposal non hanno `drifts`, e la lista resta dopo l'approvazione.
- `trama proposal new … --resolution` crea una Draft di tipo `resolution`; insieme a `--import` è rifiutato.
- `trama proposal resolve-drift <id> <drift> --decision <proposal|dismissed|fix-code> [--option <n>] [--note <text>]` registra o sostituisce la decisione su un Drift, e `--remove` lo toglie dalla lista. Accetta numeri brevi e identità e non è riservato al developer. È rifiutato senza cambiare nulla, dicendo perché, quando la Proposal non è una risoluzione o non è Draft né aperta, il Drift non esiste o non è aperto, sta già in un'altra risoluzione in scrittura o aperta, `fix-code` manca dell'opzione per un Drift che ne ha o ne nomina una inesistente, oppure un'opzione o una nota accompagnano un'altra decisione.
- Come cambiare un file, ogni registrazione riporta a Draft una risoluzione aperta e lo dice nell'uscita.
- Approvare una risoluzione, come un import, non fa partire nessuna scansione e non scrive l'ambito di scansione (gli effetti sui Drift non fanno parte di questo Task).
