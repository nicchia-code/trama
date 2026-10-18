---
column: done
technical: true
refs:
  - requirements/tech#General
drift: 47vr8kz1
proposal: null
agent: false
created: 2026-10-18T21:13:14.219Z
finished: 2026-10-18T21:20:16.104Z
---
# Fix code to match the Requirements: Windows tests do not block release

## What happens

The release workflow runs the test suite on Windows as a non-blocking step, so a failing test on Windows still produces the Windows package. The other platforms stop on a failing test.

## What should happen

The Windows package is built and tested with the same phases as the other platforms, and its tests are portable enough to run in full.

## Chosen option

**Make the Windows test step blocking and fix its failures**

Run the full suite on Windows as a blocking step, so the portability of the tests is enforced. Recommended.

## Where in the code

.github/workflows/release.yml
