---
column: done
technical: true
refs:
  - requirements/tech#announcement
  - requirements/rules#announcement
drift: null
proposal: null
agent: false
created: 2026-10-11T05:45:37.861Z
finished: 2026-10-11T05:49:28.363Z
---
# Teach trama-implement to report a failed or unfinished check as failed

When the final check of a Run fails and cannot be fixed, or the Run stops before its check is over, the Run closes the check as failed, before its report, so the editor learns of a failure and not of a success. The same holds when the scan of the completed Tasks' scope fails or stops. The paragraph that announces the Run's check also says the end-of-Run scan covers the completed Tasks' scope, not the whole System, as the scan step itself says.
