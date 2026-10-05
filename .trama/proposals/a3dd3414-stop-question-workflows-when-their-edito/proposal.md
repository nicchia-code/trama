---
status: approved
base:
  actors/editor.md: new
  actors/agent.md: 1255aa53bd853544d94fcc663bbe6e4f0dac617504eb7008ae37d4bd20734cdd
  agent-questions/feature.md: 8d164e67c4f8d691bc00efbd3df69f495edd7dca92d2a32b7fc7e3f82bbe9cd0
  agent-questions/question-round.md: ee74b97019c0130bc799dc89fa2295af7ceefe3bd7c4dd09f6e92a4e81d44cd3
  requirements/data.md: 7e822fff3007c539b2b9ed58ca0bf4acacf65448d0af1c543b7e6dc44957f304
  requirements/rules.md: 54c719bad8e5ec4d9fc57dea423736131e22ce513ac61bca6706f77b4a327877
  requirements/tech.md: 9c984f5398c96fd58325b5d5649c7c6bf090edcd9be1e4e37e8c780d1706c4c7
delete: []
created: 1970-01-01T00:00:00.013Z
---
# Stop question workflows when their editor closes

Addresses Drift 0002. The developer chose to stop the agent workflow if the editor closes during an admitted question round, without returning partial answers, applying recommendations or falling back to another question interface. Initial editor unavailability keeps the existing fallback, as explicitly confirmed. Add an editor-loss Event and an Interrupted final State reachable from both Queued and Asking, discard incomplete answers, and distinguish this interruption from initial editor unavailability in the shared CLI/tool contract. All pending rounds assigned to the lost window are interrupted; there is no automatic rerouting, retry or resumption. This stops the question-dependent workflow, not unrelated editor windows, other agent requests or OS processes. No code implementation is included.
