---
created: 2026-10-23T12:17:06.591Z
updated: 2026-10-23T12:17:06.591Z
summary: In VS Code la vista omp Chat sta nella barra laterale secondaria, in Cursor nel pannello in basso; i job la mostrano senza prendere il focus.
tasks:
  - lyh3pfvf
  - 0rym9fsk
  - 8s27fa30
  - 7zpd94gt
cleared:
  0rym9fsk:
    title: omp Chat si mostra dove sta
    proposal: c18149e0
    tag: omp Chat
    finished: 2026-10-23T12:15:26.319Z
    refs:
      - omp-chat-conversation
      - requirements/quality#omp-chat-conversation
  lyh3pfvf:
    title: omp Chat a destra
    proposal: c18149e0
    tag: omp Chat
    finished: 2026-10-23T12:13:21.845Z
    refs:
      - omp-chat
      - requirements/tech#omp-chat
      - requirements/ui#omp-chat
  8s27fa30:
    title: Engine VS Code 1.106
    proposal: c18149e0
    tag: omp Chat
    finished: 2026-10-23T12:12:22.240Z
    refs:
      - specs#frameworks
      - requirements/tech#General
  7zpd94gt:
    title: Descrizione di omp Chat aggiornata
    proposal: c18149e0
    tag: omp Chat
    finished: 2026-10-23T12:12:15.692Z
    refs:
      - panel/Settings
      - requirements/ui#panel/Settings
---
# omp Chat a destra

La vista omp Chat ha ora due contenitori: nella barra laterale secondaria per VS Code e per ogni editor che non è Cursor, nel pannello in basso per Cursor, da dove il developer può portarla a destra con Move View. Una chiave di contesto tiene visibile solo la vista dell'editor in uso. Design, scan e Run aprono la conversazione senza prendere il focus, anche dopo un ricaricamento; Quick Task e Ask more lo prendono. L'estensione richiede VS Code 1.106 o successivo, e la descrizione dell'impostazione `trama.ompChat` non nomina più nessuna posizione. README, CHANGELOG e prove a mano sono aggiornati.
