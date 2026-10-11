---
column: done
technical: false
refs:
  - drift-resolution
  - requirements/rules#drift-resolution
drift: e5g1vmgl
proposal: null
agent: false
created: 2026-10-11T05:07:16.537Z
finished: 2026-10-11T05:17:37.547Z
---
# Fix code to match the Model: A developer scan that ends without a successful check does not make failed cases re-evaluable

## What happens

Failed or excluded cases become evaluable again only when a manual scan declares a successful check. A scan started by the developer that fails or is interrupted leaves them excluded.

## What should happen

A scan started by the developer makes failed cases re-evaluable; an automatic scan does not. Success is not required, since a failed or interrupted scan still counts as finished.

## Chosen option

**Re-evaluate when a developer scan starts or ends**

Clear the exclusions for a developer scan whatever its outcome. Small change next to the existing clearing; matches the requirement and the finished-with-any-outcome rule.

## Where in the code

extension/src/host/drift-resolution.ts (check handling and scan end)
