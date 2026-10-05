---
status: approved
base:
  agent-launching/agent-terminal.md: 37712654fbcaed22dc469cbc3da84e36e58ef7583c41fd0bd404a0773b187935
  requirements/rules/agent-terminal.md: 5617c558ede270ea11c0942096f4a0d364afb6f34feb32bd6944b8226a655fea
  requirements/tech/agent-terminal.md: 397c18485dcc3e735a87790d5f80369d2ef6f1d8511e7bdf99e2e4fb08d29624
  requirements/ui/agents.md: 8a1f42752712ed98c512ae0e4b43d2a299402f051fd75f2c7d6407bad41c06e4
delete: []
created: 2026-10-05T18:28:33.758Z
---
# Agent terminals named after their work, tabs without focus

Il developer vuole riconoscere a colpo d'occhio cosa fa ogni terminale dell'agente, e non vuole che la scheda del terminale gli rubi il focus.

- Il terminale che implementa un solo Task si chiama con il numero breve del Task (per esempio `T3`).
- Le altre istruzioni hanno un'etichetta per tipo: `Design` (anche il rifacimento di una Proposal obsoleta), `Scan` (a mano o automatica), `All tasks`, il numero breve della Proposal per l'implement di un design (per esempio `P2`), `Import`.
- Un terminale libero si riusa solo se la nuova istruzione ha lo stesso nome; altrimenti se ne apre uno nuovo e il vecchio resta aperto, non più seguito.
- Con «terminal-tab» la scheda va in primo piano nel suo gruppo ma non prende il focus.
- I nomi valgono per tutti i launcher del terminale (integrato, scheda, finestra esterna quando il terminale permette il titolo); i terminali dei worktree restano «Trama agent».

Assunzioni da controllare: la regola del riuso per nome vale anche per le finestre esterne; senza focus la colonna della scheda si ricorda trovando la scheda del terminale per nome invece che dal gruppo attivo.
