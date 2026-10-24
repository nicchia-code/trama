---
created: 2026-10-24T18:33:35.243Z
updated: 2026-10-24T18:33:35.243Z
summary: Ogni conversazione omp Chat con l'hook finisce il lavoro alla fine del turno, con o senza job; trama.autoExit si legge solo dalle impostazioni utente.
tasks:
  - jrhf90vk
  - waksk8py
---
# Fine turno in omp Chat e autoExit utente

La fine del turno vale per Design, Setup, rifacimento e Import come per gli altri lavori: con auto exit acceso la conversazione si chiude, spento passa ad Agent idle. Le richieste di permesso aperte a fine turno sono annullate e i messaggi trattenuti partono in turni nuovi. La ripresa di Ask more salvata running finisce a riposo. L'auto exit ignora i valori del workspace.
