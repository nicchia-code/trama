---
column: done
technical: false
refs:
  - project/Trama project/developer.UPDATE_SKILLS
  - requirements/rules#project
drift: null
proposal: null
agent: false
created: 2026-10-11T08:52:02.389Z
finished: 2026-10-11T08:56:46.139Z
---
# Report the chat sub-agent definition in the Update Agent Skills result

Quando il developer lancia Update Agent Skills dall'editor, il resoconto mostrato deve dire che la definizione utente del sotto-agente di confronto per la chat di quell'editor (Cursor o Copilot) è stata scritta, oppure che non si è potuta scrivere. Oggi il resoconto elenca solo le righe del comando (skill, omp, Aree, rigenerazione) e un errore di scrittura compare come messaggio a parte; quando la scrittura riesce, il resoconto non ne parla. Il resoconto deve dire l'esito in entrambi i casi. Dalla riga di comando non cambia nulla: la definizione non viene toccata.
