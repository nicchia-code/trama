---
created: 2026-10-18T21:22:37.097Z
updated: 2026-10-18T21:22:37.097Z
summary: Simple Icons is no longer a runtime dependency, and the Windows tests block the release workflow.
tasks:
  - 1tlibd6x
  - hffgpwvx
---
# Runtime deps and release CI

The logo set now comes from a local file with 72 logos instead of the whole Simple Icons library (about 3,000). Java, AWS, Bash, PowerShell, OpenAI, Slack and Playwright fall back to the generic icon. The release workflow runs the Windows tests as a blocking step; the Windows failures are not fixed yet, so that step can fail until they are. extension/dist/webview.js still holds the old bundle and needs a rebuild.
