---
created: 2026-10-18T21:22:37.237Z
updated: 2026-10-18T21:29:01.078Z
summary: Reads of .trama/ files and installed skills go through the shared LF-normalizing helper.
tasks:
  - 4ce4gzox
  - w7huhz14
  - x2vjx2z6
cleared:
  x2vjx2z6:
    title: Single line-ending normalisation point
    finished: 2026-10-18T21:28:23.836Z
    refs:
      - requirements/tech#General
  w7huhz14:
    title: Line endings in one place
    finished: 2026-10-18T21:25:07.933Z
    refs:
      - requirements/tech#General
  4ce4gzox:
    title: "Fix code to match the Requirements: Line endings not normalized on reads"
    finished: 2026-10-18T21:19:21.207Z
    refs:
      - requirements/tech#General
---
# Line endings on reads

The short-number, timing, last-scan, Requirements, skill and comparison readers, plus the text parsers, all normalize CRLF to LF through one helper in src/core (normalizeLf in store.ts), and tests cover line endings and a CRLF checkout of a compared file.
