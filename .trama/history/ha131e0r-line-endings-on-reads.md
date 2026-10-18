---
created: 2026-10-18T21:22:37.237Z
updated: 2026-10-18T21:29:01.078Z
summary: Reads of .trama/ files and installed skills go through the shared LF-normalizing helper.
tasks:
  - 4ce4gzox
  - w7huhz14
  - x2vjx2z6
---
# Line endings on reads

The short-number, timing, last-scan, Requirements, skill and comparison readers, plus the text parsers, all normalize CRLF to LF through one helper in src/core (normalizeLf in store.ts), and tests cover line endings and a CRLF checkout of a compared file.
