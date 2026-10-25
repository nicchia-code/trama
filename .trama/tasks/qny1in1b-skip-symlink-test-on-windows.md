---
column: done
technical: true
refs:
  - requirements/tech#General
drift: null
proposal: null
agent: false
created: 2026-10-24T19:48:06.715Z
finished: 2026-10-24T20:45:59.990Z
---
# Skip symlink test on Windows

The test that checks instruction files are ignored when they are symlinks, or missing through a symlink, must run only where symlinks can be created. On Windows it must be skipped, with the reason written in the test, the same way the host-path tests already skip Windows-only cases. When done, the test suite passes on Windows without developer mode.
