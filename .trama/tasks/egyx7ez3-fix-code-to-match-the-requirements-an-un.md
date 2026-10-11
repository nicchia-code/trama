---
column: done
technical: true
refs:
  - requirements/rules#drift-resolution
  - requirements/quality#agent-launching
drift: slwd4dzx
proposal: null
agent: false
created: 2026-10-11T05:07:16.559Z
finished: 2026-10-11T05:18:36.452Z
---
# Fix code to match the Requirements: An unrecognized autopilot value starts Resolve Drifts as if the delegation were on

## What happens

The coordinator reads the delegation setting from user settings only and treats any value that is not `enabled` or `yolo` as off. The Resolve Drifts button reads the setting differently: it compares only against `disabled`. A mistyped value therefore skips the manual flow and enters the automatic split, as if the delegation were `enabled`.

## What should happen

The setting is `disabled`, `enabled` or `yolo`; an absent or unrecognized value means `disabled`, and the manual Resolve Drifts flow stays unchanged. The delegation is read from user settings only, in one way for every step.

## Chosen option

**Read the mode in one place**

Make the Resolve Drifts button use the same user-settings reader as the coordinator, so an unrecognized value means disabled. One-line change.

## Where in the code

extension/src/host/controller.ts, Resolve Drifts case of the launch action
