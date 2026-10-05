---
column: done
technical: false
refs:
  - project/Not a Trama project/developer.INITIALIZE_PROJECT
  - project/Trama project/developer.UPDATE_SKILLS
  - requirements/rules#project
  - requirements/tech#General
drift: null
proposal: "01636896"
agent: false
created: 1970-01-01T00:00:00.019Z
---
# Ship the trama-fix skill and install it with the other agent skills

The trama-fix skill is one of the agent skills that ship with Trama: it is embedded in the command-line binary, installed by initializing a project and by updating skills into the skills folder (an existing different copy is a conflict on initialize, and is overwritten on update), and listed among the skills in the project's documentation. Depends on the skill itself.
