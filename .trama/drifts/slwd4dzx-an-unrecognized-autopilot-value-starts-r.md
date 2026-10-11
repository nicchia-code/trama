---
status: resolved
resolution: fix-code
refs:
  - requirements/rules#drift-resolution
  - requirements/quality#agent-launching
proposal: null
task: egyx7ez3
origin: null
critical: false
option: 1
note: null
resolvedBy: ej18oyqh
created: 2026-10-11T05:04:02.624Z
---
# An unrecognized autopilot value starts Resolve Drifts as if the delegation were on

## What happens

The coordinator reads the delegation setting from user settings only and treats any value that is not `enabled` or `yolo` as off. The Resolve Drifts button reads the setting differently: it compares only against `disabled`. A mistyped value therefore skips the manual flow and enters the automatic split, as if the delegation were `enabled`.

## What should happen

The setting is `disabled`, `enabled` or `yolo`; an absent or unrecognized value means `disabled`, and the manual Resolve Drifts flow stays unchanged. The delegation is read from user settings only, in one way for every step.

## Fix options

### Read the mode in one place

Make the Resolve Drifts button use the same user-settings reader as the coordinator, so an unrecognized value means disabled. One-line change.

### Reject unknown values in the setting

Keep the two readers but restrict the setting in the manifest. Does not protect a hand-edited value, so the code still has to normalize it.

## Where in the code

extension/src/host/controller.ts, Resolve Drifts case of the launch action
