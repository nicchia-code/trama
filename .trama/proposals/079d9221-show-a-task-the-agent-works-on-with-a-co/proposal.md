---
status: rejected
base:
  editor-panel/panel.md: 0723ee28c5847d6da303605c7e2de5e23de17e32f318d49f63f0bad6be77172d
  requirements/ui.md: da22f90089ba2dd199537861d09298053ddbeddd40e4f22998b51065b04f0d48
delete: []
created: 1970-01-01T00:00:00.011Z
---
# Show a Task the agent works on with a coloured dot, not a badge

The 'agent working' badge on the Board is not needed. Decisions confirmed with the developer: every Task card, normal or inside a design card, shows the status dot beside its number; a Task the agent has taken has a dot of a distinct colour that pulses (stopped for reduced motion); the badge goes away everywhere; the lock itself (disabled moves, no dragging, Take back, disabled Run buttons) is unchanged; the '(agent working)' mark is removed from trama board, trama task list and the agent tools; the 'in writing' card of Proposal 0010 shows its text with the same coloured dot, without animation. Choices to check: the tooltip and accessible name of the dot say 'In progress, agent working', so colour is never the only signal; with the mark gone from the text views, the command line no longer shows which Tasks the agent has taken.

## Feedback

Per il momento solo da riproporre. Faccio io
