---
column: done
technical: false
refs:
  - drift
  - requirements/data#drift
  - requirements/rules#drift
  - requirements/tech#drift
  - requirements/ui#drift
drift: null
proposal: "0019"
agent: false
---
# Let a Drift carry an optional Where in the code section

A Drift can say where in the code the difference was seen, apart from its two sides.

- The Drift file has an optional third section after What happens and What should happen. When given it must have text; a Drift without it stays valid, and Drifts written earlier are untouched.
- `trama drift new` and the `trama_drift_new` tool accept the text as an optional `--where` / `where`. Both required texts keep being required.
- The Task created when the code is fixed carries the section after the two sides, when the Drift has it.
- The snapshot given to the panel includes the text.
- `trama drift show` and the agent tools print a block headed "Where in the code" after the two sides and before the attached Proposal, when the Drift has the section. Texts are printed as the Markdown they were written in.
- The descriptions of the command and tool say that the two sides describe behaviour and that code locations go only in this text.
