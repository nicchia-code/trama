---
status: approved
requires:
  - "0022"
base:
  requirements/rules.md: fc0f61a550b526e1c8b8a473d9fa51b84a0483d3194167b39d6d5cb0003f511a
  requirements/tech.md: bfa57a7700fdcb19523aaf3eb703a8fd4d853811937e245df31c8aae44b29a90
delete: []
---
# Runs stop at the first Drift, always

The Run actions and the skill that implements Tasks no longer skip blocked Tasks or go on after a Drift: whenever a Drift is met, the run stops. A Drift met is one the agent files during the run, or one that already blocks the Task the run reaches. The agent then reports what it did and the Drift that stopped it. Running one Task that is blocked is still refused and the run stops there. Decisions for the developer to check: only Requirements change, because the Model does not describe runs; the Requirement of the instructions for the run actions already says to stop and is unchanged. Written on top of 0022 because both change rules.md and tech.md.
