---
created: 2026-10-18T07:32:06.736Z
updated: 2026-10-24T20:56:01.773Z
summary: "La finestra dei dettagli di una voce di History mostra titolo e data completa, resta modale anche quando la Board si aggiorna o la voce cambia posto, e non si ridisegna a ogni aggiornamento: scorrimento e fuoco restano dove sono finché il contenuto non cambia."
tasks:
  - r174qdoy
  - u5n144hu
  - jdtjzcek
  - 5xjjz3fm
cleared:
  jdtjzcek:
    title: "Fix code to match the Model: Finestra della voce non più modale"
    finished: 2026-10-18T08:04:00.970Z
    refs:
      - voce-history/Registrata/agent.VOCE_HISTORY_AGGIORNATA
      - requirements/ui#voce-history
  u5n144hu:
    title: "Fix code to match the Requirements: Layout della finestra della voce"
    finished: 2026-10-18T07:37:31.480Z
    refs:
      - requirements/ui#voce-history
  r174qdoy:
    title: "Fix code to match the Model: Modale della voce ricostruita"
    finished: 2026-10-18T07:24:39.577Z
    refs:
      - voce-history
      - requirements/ui#voce-history
  5xjjz3fm:
    title: "Fix code to match the Requirements: History modal focus skips Close"
    finished: 2026-10-24T20:46:14.476Z
    refs:
      - requirements/ui#voce-history
---
# Modale della voce di History

Mentre la finestra dei dettagli è aperta, la Board non ne ricostruisce più il corpo a ogni aggiornamento. Il testo letto conserva la sua posizione di scorrimento e il fuoco resta sul pulsante Close. La finestra si ridisegna solo quando titolo, data, testo o Task della voce cambiano davvero.
