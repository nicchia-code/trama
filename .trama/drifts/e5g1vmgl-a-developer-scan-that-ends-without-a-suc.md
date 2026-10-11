---
status: resolved
resolution: fix-code
refs:
  - drift-resolution
  - requirements/rules#drift-resolution
proposal: null
task: poy4kyb2
origin: null
critical: false
option: 1
note: null
resolvedBy: ej18oyqh
created: 2026-10-11T05:03:14.596Z
---
# A developer scan that ends without a successful check does not make failed cases re-evaluable

## What happens

Failed or excluded cases become evaluable again only when a manual scan declares a successful check. A scan started by the developer that fails or is interrupted leaves them excluded.

## What should happen

A scan started by the developer makes failed cases re-evaluable; an automatic scan does not. Success is not required, since a failed or interrupted scan still counts as finished.

## Fix options

### Re-evaluate when a developer scan starts or ends

Clear the exclusions for a developer scan whatever its outcome. Small change next to the existing clearing; matches the requirement and the finished-with-any-outcome rule.

### Keep success-only and change the Requirement

State that only a successful developer scan re-opens failed cases. No code change, but a failing scan then never helps.

## Where in the code

extension/src/host/drift-resolution.ts (check handling and scan end)
