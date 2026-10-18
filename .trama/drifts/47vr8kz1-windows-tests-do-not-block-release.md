---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#General
proposal: null
task: hffgpwvx
origin: null
critical: false
option: 1
note: null
resolvedBy: 456gwpy9
created: 2026-10-18T20:39:30.408Z
---
# Windows tests do not block release

## What happens

The release workflow runs the test suite on Windows as a non-blocking step, so a failing test on Windows still produces the Windows package. The other platforms stop on a failing test.

## What should happen

The Windows package is built and tested with the same phases as the other platforms, and its tests are portable enough to run in full.

## Fix options

### Make the Windows test step blocking and fix its failures

Run the full suite on Windows as a blocking step, so the portability of the tests is enforced. Recommended.

### Keep the step non-blocking and record it in the Requirements

Keep the step non-blocking and amend the Requirements to say Windows test failures are only reported, a developer decision.

## Where in the code

.github/workflows/release.yml
