---
created: 2026-10-22T08:59:26.455Z
updated: 2026-10-22T08:59:26.455Z
summary: L'agente dichiara note brevi sugli annunci in attesa; la Board mostra l'ultima nota sul ghost e un modale di dettagli con tutte le note.
tasks:
  - 7q3rbvia
  - mif1mn1i
cleared:
  mif1mn1i:
    title: Dettagli dei ghost sulla Board
    proposal: sk8koj3a
    tag: ghost details
    finished: 2026-10-22T08:58:07.658Z
    refs:
      - panel/Board
      - panel/Open/developer.SHOW_BOARD
      - requirements/ui#announcement
  7q3rbvia:
    title: Note sugli annunci
    proposal: sk8koj3a
    tag: ghost details
    finished: 2026-10-22T08:53:36.282Z
    refs:
      - announcement
      - agent.DECLARE_ANNOUNCEMENT_NOTE
      - requirements/rules#agent.DECLARE_ANNOUNCEMENT_NOTE
      - requirements/data#agent.DECLARE_ANNOUNCEMENT_NOTE
      - requirements/cli#agent.DECLARE_ANNOUNCEMENT_NOTE
      - requirements/tech#agent.DECLARE_ANNOUNCEMENT_NOTE
---
# Note e dettagli dei ghost

L'agente dichiara con `trama announcement edit` una riga su cosa sta facendo: l'annuncio tiene le ultime 6 note con l'istante, senza cambiare fase, titolo o consegna. Le skill dicono quando scriverle. Sulla Board ogni ghost è un pulsante che mostra l'ultima nota sotto la fase e si apre in un modale di sola lettura con tipo, titolo, durata, spiegazione per fase e storico delle note.
