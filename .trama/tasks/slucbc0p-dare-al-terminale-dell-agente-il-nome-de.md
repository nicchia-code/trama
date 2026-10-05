---
column: done
technical: false
refs:
  - agent-terminal/No agent terminal/developer.ASK_AGENT
  - agent-terminal/Agent running/developer.ASK_AGENT
  - agent-terminal/Agent idle/developer.ASK_AGENT
  - agent-terminal/No agent terminal/proposal.APPROVED
  - agent-terminal/Agent running/proposal.APPROVED
  - agent-terminal/Agent idle/proposal.APPROVED
  - requirements/rules#agent-terminal
  - requirements/tech#agent-terminal
  - requirements/ui#agent-terminal
drift: null
proposal: w9fcrqg5
agent: false
created: 2026-10-05T18:32:53.190Z
---
# Dare al terminale dell'agente il nome del lavoro e riusarlo solo per lo stesso nome

Ogni terminale integrato che Trama apre per l'agente, nell'area dei terminali o come scheda dell'editor, porta il nome del lavoro che gli affida invece di «Trama agent»:

- implement di un Task → il numero breve del Task (per esempio `T3`);
- implement di un design → il numero breve della Proposal (per esempio `P2`);
- richiesta di design rapida, richiesta scritta e rifacimento di una Proposal obsoleta → `Design`;
- scansione del System, di Feature, automatica dopo un'approvazione o dopo l'unione di un giro → `Scan`;
- implement all → `All tasks`;
- import → `Import`.

Il numero breve è quello della copia di lavoro aperta al momento dell'invio; il nome non cambia più finché il terminale resta aperto, anche se il numero cambia, e non dipende dalla lingua scelta. Il titolo della scheda con «terminal-tab» è questo nome.

Un terminale libero (Agent idle) si riusa solo se, oltre alle condizioni di oggi, la nuova istruzione ha esattamente lo stesso nome; altrimenti se ne apre uno nuovo con il nome nuovo e il vecchio resta aperto, non più seguito, come quando è occupato. Con un terminale occupato si apre sempre uno nuovo, come oggi.

I terminali dei worktree non cambiano: restano «Trama agent» e non entrano in questa regola.
