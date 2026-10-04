---
column: done
technical: true
refs:
  - requirements/rules#proposal
  - requirements/data#proposal
drift: null
proposal: null
agent: false
---
# Update the documentation and acceptance script for optional rejection feedback (technical)

The command line reference and the file format reference say that rejection appends Feedback only when text was given and that the command's feedback is optional; the acceptance script's reject step no longer expects the editor to refuse an empty box and adds a check that an empty box rejects without a Feedback section.
