---
column: done
technical: true
refs:
  - requirements/tech#General
drift: null
proposal: null
agent: false
created: 2026-10-18T21:26:52.677Z
finished: 2026-10-18T21:28:23.836Z
---
# Single line-ending normalisation point

Every place that normalises line endings for hashing, comparing or parsing Trama's text goes through the one shared helper in the core. Today the comparison fingerprint and some parsers still replace CRLF on their own, so there is more than one point.
