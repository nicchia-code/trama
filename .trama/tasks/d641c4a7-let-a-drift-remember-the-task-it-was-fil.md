---
column: done
technical: false
refs:
  - drift
  - requirements/data#drift
  - requirements/rules#drift
  - requirements/tech#task
drift: null
proposal: 94f35a4f
agent: false
created: 1970-01-01T00:00:00.035Z
---
# Let a Drift remember the Task it was filed from

A Drift the agent files while implementing a Task remembers that Task, its origin; a Drift filed by a Scan or a Fix has none, and so do Drifts written before the origin existed. Creating a Drift with an origin that is not an existing Task is refused. The origin can be given with the command line (`drift new --task <id>`) and with the agent tool that creates a Drift.
