---
column: done
technical: true
refs:
  - requirements/tech#General
drift: null
proposal: null
agent: false
created: 2026-10-18T21:22:14.059Z
finished: 2026-10-18T21:25:07.933Z
---
# Line endings in one place

Every read of a project file under .trama/ normalizes line endings (CRLF to LF) in one single place in src/core, and no caller normalizes on its own. Today the last-scan instant is read with its own trailing-newline cleanup, and the Requirements import normalizes inline. Both must read through the shared helper, with no change in what they return.
