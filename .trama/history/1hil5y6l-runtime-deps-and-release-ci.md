---
created: 2026-10-18T21:22:37.097Z
updated: 2026-10-24T20:56:02.021Z
summary: Simple Icons is no longer a runtime dependency, and the Windows tests block the release workflow.
tasks:
  - 1tlibd6x
  - hffgpwvx
  - iwvkflf8
  - qny1in1b
cleared:
  iwvkflf8:
    title: Release senza blocchi
    proposal: llcktsts
    tag: Citazione PS 5.1
    finished: 2026-10-20T17:55:55.137Z
    refs:
      - requirements/tech#General
  hffgpwvx:
    title: "Fix code to match the Requirements: Windows tests do not block release"
    finished: 2026-10-18T21:20:16.104Z
    refs:
      - requirements/tech#General
  1tlibd6x:
    title: "Fix code to match the Requirements: Simple Icons runtime dependency"
    finished: 2026-10-18T21:17:57.849Z
    refs:
      - requirements/tech#General
---
# Runtime deps and release CI

The logo set now comes from a local file with 72 logos instead of the whole Simple Icons library (about 3,000). Java, AWS, Bash, PowerShell, OpenAI, Slack and Playwright fall back to the generic icon. The release workflow runs the Windows tests as a blocking step; the Windows failures are not fixed yet, so that step can fail until they are. extension/dist/webview.js still holds the old bundle and needs a rebuild. Open: the release hang (Task Release senza blocchi, still in doing) is not fixed. CI run 39323773655 stalled on Ubuntu after test/compared.test.ts printed its ninth test, and run 39380019299 was cancelled on macOS after 72 minutes. The stalling test is not identified and not reproduced locally. Only timeout-minutes on the release jobs and bounded git calls in src/core/compared.ts and test/compared.test.ts are in place.
