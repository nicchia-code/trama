---
created: 2026-10-18T20:40:58.692Z
updated: 2026-10-18T20:40:58.692Z
summary: "Chi confronta una Machine usa la skill trama-compare: il briefing dà gli stati, gli eventi e le transizioni, la scheda di confronto si archivia in un solo passo e il pre-flight salta i confronti già riusciti."
tasks:
  - 3s7779pn
  - j340jw58
  - i4w9i01k
  - bzyl0cui
cleared:
  bzyl0cui:
    title: Registro dei confronti
    proposal: 4td4mzmg
    tag: Coda continua
    finished: 2026-10-18T20:22:46.514Z
    refs:
      - requirements/rules#work
      - requirements/tech#work
      - requirements/data#announcement
      - requirements/tech#drift
  3s7779pn:
    title: Skill trama-compare
    proposal: suahhze5
    tag: Confronti leggeri
    finished: 2026-10-18T20:10:59.241Z
    refs:
      - requirements/tech#proposal
      - requirements/tech#General
      - requirements/rules#project
      - requirements/tech#agent-launching
  j340jw58:
    title: Briefing e archiviazione in blocco
    proposal: suahhze5
    tag: Confronti leggeri
    finished: 2026-10-18T20:05:52.800Z
    refs:
      - requirements/tech#drift
      - requirements/tech#panel/Board
      - requirements/tech#editor-chat
  i4w9i01k:
    title: Ghost del confronto
    proposal: suahhze5
    tag: Confronti leggeri
    finished: 2026-10-18T19:57:40.160Z
    refs:
      - announcement
      - agent.FILE_COMPARISON
      - requirements/rules#announcement
      - requirements/data#announcement
      - requirements/tech#announcement
      - requirements/ui#announcement
---
# Confronto delle Machine con trama-compare

Una skill distribuita corta, trama-compare, porta tutto ciò che serve a confrontare una Machine. Il comando trama compare brief annuncia il confronto e stampa gli stati, gli eventi e le transizioni con i riferimenti da confrontare; trama compare file archivia in un solo passo le schede trovate, anche nessuna. Il confronto appare sulla Board come ghost Comparing e arriva come Delivered.

Il registro dei confronti calcola l'impronta del codice e del testo di Modello e Requisiti: nel pre-flight non si confronta di nuovo ciò che è già riuscito con lo stesso codice e lo stesso testo.

Task: 3s7779pn Skill trama-compare, j340jw58 Briefing e archiviazione in blocco, i4w9i01k Ghost del confronto, bzyl0cui Registro dei confronti.
