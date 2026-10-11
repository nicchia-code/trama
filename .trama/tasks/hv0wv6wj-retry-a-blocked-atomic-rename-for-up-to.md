---
column: done
technical: true
refs:
  - requirements/tech#General
drift: null
proposal: null
agent: false
created: 2026-10-11T17:08:14.052Z
finished: 2026-10-11T17:34:02.711Z
---
# Retry a blocked atomic rename for up to one second with one shared helper

Ogni scrittura atomica (file temporaneo rinominato sopra l'esistente: `.trama/short-numbers/assigned`, `.trama/last-scan/system`, la richiesta di approvazione, i record del canale locale) che fallisce con `EPERM`, `EACCES` o `EBUSY` si ritenta per al più 1 secondo, poi dà l'errore, e il file temporaneo non resta su disco. Oggi ognuna chiama la rinomina direttamente e fallisce subito. Un solo aiuto in `src/core` serve tutte queste scritture.
