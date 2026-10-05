---
column: done
technical: false
refs:
  - drift
  - requirements/data#drift
  - requirements/rules#drift
  - requirements/tech#drift
drift: null
proposal: 80b32cae
agent: false
created: 1970-01-01T00:00:00.049Z
---
# Give every Drift a What happens side and a What should happen side, and require both when it is filed

A new Drift is written with two sections, What happens and What should happen, in this order after its title. Filing a Drift without one of them is refused, naming the missing one, in the command line and in the agent tool; both take the two texts in place of the old single body, which no longer exists. The Task that fixing the code of a Drift creates carries both sections as its body. Resolved Drifts written before keep their free body.
