---
status: approved
base:
  work/task.md: ba6517d2d2dd2c39315fb304f45091dbf41c9a006a8a314f97079bbe73c3142d
  work/announcement.md: d8869540b185a8737577fb9fab7ecf29d9876e54543d096e0f381b2447077ab4
  editor-panel/panel.md: ac9cc671337ae7a4b56a39dd8a40aa1faaa00a4c18a47ff71e0e04a1a9f129ea
  requirements/data/work.md: 79af32324f76c20e9e1e4997e919ad01d91168ad1cefb075abe02f336b65a0a0
  requirements/rules/announcements.md: 4ec68677cf63dff245cd6a999606e9156bb649ccb42d79381da157eaa719b077
  requirements/tech/work.md: 7e71dafba0b62f71d0073cbdb430728795891cb5f382f2994c7b53f19a3e8c13
  requirements/tech/autopilot.md: 448edfb8144b6b69386c0f2f8bb1a0e9844981c0a9471ddab9fbbe4b9b024b04
delete: []
created: 2026-10-11T07:13:06.701Z
scanScope:
  - ref: panel/Open
    reason: changed
  - ref: announcement
    reason: changed
  - ref: task
    reason: changed
  - ref: panel/Closed/developer.OPEN_PANEL
    reason: leads into a change
  - ref: panel/Closed/question-round.ROUND_OPENED
    reason: leads into a change
  - ref: requirements/data#task
    reason: changed
  - ref: requirements/rules#announcement
    reason: changed
  - ref: requirements/tech#drift-resolution
    reason: changed
  - ref: requirements/tech#task
    reason: changed
---
# Reset the Scan counter when the System scan is launched

Il numero di Task finiti dall'ultimo scan globale, sul pulsante Scan del Sistema, si azzera quando il developer lancia lo scan, non quando l'agente lo dichiara finito.

Decisioni:
- L'istante dell'ultimo scan globale si scrive quando l'istruzione dello scan di tutto il Sistema lanciata dal pulsante Scan è consegnata: scritta nel terminale, inviata alla chat, lasciata pronta nella chat o copiata negli appunti. Una pressione che non consegna nulla non azzera.
- La fine dello scan, riuscito, fallito o interrotto, non tocca più il numero: resta azzerato.
- I Task che arrivano in Done mentre lo scan è in corso contano nel numero.
- Il ricordo in memoria dei lanci dello scan globale e il riconoscimento del controllo `Scan of the System` per il numero non servono più e sono tolti.
