---
column: done
technical: false
refs:
  - agent-terminal/No agent terminal/developer.ASK_AGENT
  - agent-terminal/Agent idle/developer.ASK_AGENT
  - agent-terminal/Agent idle/proposal.APPROVED
  - requirements/rules#agent-terminal
  - requirements/tech#agent-terminal
drift: null
proposal: w9fcrqg5
agent: false
created: 2026-10-05T18:32:53.374Z
---
# Dare alla finestra esterna il nome del lavoro e riusarla solo per lo stesso nome

Con il launcher «external-terminal» la finestra del terminale di sistema prende lo stesso nome del terminale integrato per quell'istruzione (numero breve del Task o della Proposal, oppure `Design`, `Scan`, `All tasks`, `Import`), su ogni terminale che permette di dare un titolo alla finestra, Terminal.app compreso. Il titolo non si cambia più dopo l'apertura.

Una finestra libera si riusa solo se valgono le condizioni di oggi (corsa precedente finita, Terminal.app, kitty o WezTerm rilevato, nessun comando di terminale scelto dal developer, scripting riuscito) e in più la nuova istruzione ha esattamente il nome della finestra. Se il nome è diverso si apre una finestra nuova, senza avvisi, e la vecchia resta aperta e non più seguita: il suo marcatore, se arriva, non conta. L'avviso del riuso fallito resta solo per lo scripting che fallisce.
