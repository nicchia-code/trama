---
column: done
technical: false
refs:
  - agent-terminal/No agent terminal/proposal.APPROVED
  - agent-terminal/Agent running/proposal.APPROVED
  - agent-terminal/Agent idle/proposal.APPROVED
  - requirements/rules#agent-terminal
  - requirements/tech#agent-terminal
  - requirements/ui#agent-terminal
drift: null
proposal: rhfwtu3m
agent: false
created: 2026-10-06T10:45:27.440Z
---
# Mandare la scansione automatica mirata all'ambito della Proposal e proseguire con i suoi Task se trama.autoImplement è acceso

Dopo l'approvazione di una Proposal ordinaria la scansione automatica non nomina più le Feature toccate: manda "Use the trama-scan skill on what Proposal <id> changed: its scan scope is in `trama proposal show <id>`. Link every Task you file to it with --proposal <id>.". Con la nuova impostazione `trama.autoImplement` (booleana, accesa di default, letta quando si costruisce l'istruzione, con la descrizione inglese `After an automatic scan that files no Drift, the same agent goes on to implement the Tasks it filed.`) la stessa riga prosegue con " If the scan files no Drift, go on with the trama-implement skill on every Task of Proposal <id> that is in the \"todo\" column, taking them from `trama task next --batch --proposal <id>`, one group at a time, until it says there is none.". Vale per tutti e tre gli State di partenza, con ogni launcher (anche la chat di Cursor e il suo Scan now quando non può inviarla da sola), con la frase della lingua in fondo. Le condizioni per partire restano quelle di prima (`trama.autoScan`, agente avviabile, almeno una Feature toccata che esiste). Una scansione chiesta a mano resta com'è e non prosegue mai con l'implementazione.
