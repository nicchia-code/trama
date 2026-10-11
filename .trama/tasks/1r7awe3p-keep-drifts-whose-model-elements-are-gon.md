---
column: done
technical: false
refs:
  - drift-resolution/Free/workspace.MODEL_CHANGED
  - requirements/rules#drift-resolution
drift: null
proposal: null
agent: false
created: 2026-10-11T05:45:20.565Z
finished: 2026-10-11T05:52:22.593Z
---
# Keep Drifts whose Model elements are gone out of automatic eligibility

A Drift is automatically eligible only when its first Fix option can be applied. A Drift whose Model elements no longer exist cannot be fixed in the code, so it is left out of the automatic collection and stays for the developer, instead of reaching the resolution agent and failing there.
