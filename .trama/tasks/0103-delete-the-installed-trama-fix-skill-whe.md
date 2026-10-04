---
column: done
technical: false
refs:
  - project/Trama project/developer.UPDATE_SKILLS
  - requirements/rules#project
drift: null
proposal: "0025"
agent: false
---
# Delete the installed trama-fix skill when skills are updated

Aggiornare le skill (comando «trama skills update» e comando dell'editor) cancella la cartella trama-fix, con qualsiasi contenuto abbia, da ogni cartella di skill che la contiene tra .agents/skills, .claude/skills, .github/skills e la cartella configurata. Il resoconto elenca la cartella cancellata; se non ce n'è nessuna non dice nulla in più. Una seconda esecuzione non trova più nulla da cancellare.
