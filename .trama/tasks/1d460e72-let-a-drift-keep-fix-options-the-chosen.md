---
column: done
technical: false
refs:
  - drift
  - requirements/data#drift
  - requirements/rules#drift
drift: null
proposal: 8fef6f72
agent: false
created: 1970-01-01T00:00:00.091Z
---
# Let a Drift keep fix options, the chosen option and the developer's note

A Drift can hold from two to five fix options, each with a title and a Markdown text, the first being the agent's recommendation, and the file keeps them apart from the two sides and from Where in the code. A Drift that was resolved by fixing the code also remembers the number of the option the developer chose and the developer's note, when there was one; a Drift without options, including every Drift written before options existed, still opens and reads as before, with no option and no note. Everything that reads a Drift, including the snapshot the panel receives, gives the options in their written order, the chosen option's number and the note.
