---
column: done
technical: false
refs:
  - agent-terminal
  - agent-terminal.INSTRUCTION_SENT
  - agent-terminal/No agent terminal/proposal.APPROVED
  - notice
  - announcement
  - requirements/rules#agent-terminal
  - requirements/rules#announcement
  - requirements/rules#design-request
drift: null
proposal: twunvqc8
agent: false
created: 2026-10-05T09:12:01.105Z
---
# Far partecipare le finestre esterne ad annunci, avvisi ntfy, scansione automatica e rilascio dei Task

Una finestra esterna si comporta in tutto come il terminale integrato per quanto riguarda il resto del System.

- Ogni istruzione scritta davvero in una finestra esterna emette `INSTRUCTION_SENT`, che annulla gli avvisi ntfy sulla fine del comando ancora in attesa.
- La fine del comando fa nascere l'avviso ntfy sulla fine (se c'è un argomento) con l'esito del comando, libera i Task presi dall'agente di quel terminale e ritira i ghost della Board appartenenti a quel terminale.
- Una richiesta di design inviata da una finestra esterna annuncia una Proposal, che appartiene a quel terminale, nel momento in cui l'istruzione è davvero inviata; il titolo di una richiesta scritta serve anche a questo ghost.
- Chiudere a mano la finestra mentre l'agente lavora non manda nessuna fine: il ghost si ritira dopo i quindici minuti di quiete e un Task preso resta preso finché l'agente non lo sposta o il developer non lo riprende.
- La scansione automatica dopo l'approvazione di una Proposal ordinaria (non un'importazione, non l'atterraggio di un giro di worktree) apre da sola una finestra esterna, alle stesse condizioni del terminale integrato, e dice quale Proposal ha approvato.
- Un avviso non viene mai recuperato se l'editor si chiude mentre l'agente lavora in una finestra esterna.
