---
created: 2026-10-24T18:33:35.243Z
updated: 2026-10-24T18:33:35.243Z
summary: Ogni conversazione omp Chat con l'hook finisce il lavoro alla fine del turno, con o senza job; trama.autoExit si legge solo dalle impostazioni utente.
tasks:
  - jrhf90vk
  - waksk8py
cleared:
  waksk8py:
    title: autoExit solo dall'utente
    proposal: ijuvpwzo
    tag: omp Chat auto exit
    finished: 2026-10-24T18:32:06.584Z
    refs:
      - requirements/quality#agent-launching
      - requirements/tech#agent-launching
  jrhf90vk:
    title: Fine turno in omp Chat
    proposal: ijuvpwzo
    tag: omp Chat auto exit
    finished: 2026-10-24T18:29:47.060Z
    refs:
      - omp-chat-conversation
      - omp-acp.TURN_ENDED
      - requirements/tech#omp-acp.TURN_ENDED
      - requirements/tech#omp-chat-conversation/Waiting for the window
---
# Fine turno in omp Chat e autoExit utente

La fine del turno vale per Design, Setup, rifacimento e Import come per gli altri lavori: con auto exit acceso la conversazione si chiude, spento passa ad Agent idle. Le richieste di permesso aperte a fine turno sono annullate e i messaggi trattenuti partono in turni nuovi. La ripresa di Ask more salvata running finisce a riposo. L'auto exit ignora i valori del workspace.
