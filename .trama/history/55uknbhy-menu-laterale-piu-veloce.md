---
created: 2026-10-26T12:44:37.590Z
updated: 2026-10-26T12:44:37.590Z
summary: Il menu laterale e il pannello non rileggono più il progetto a ogni cambio di vista, il controllo delle skill parte solo all'apertura e il quadro si costruisce una volta sola, con una cache dei file.
tasks:
  - lhcb08a8
  - ouejncwj
  - sbdtvvj7
---
# Menu laterale più veloce

Il menu laterale rimanda l'ultimo stato calcolato quando il pannello cambia vista o la vista torna visibile, senza costruire il quadro né lanciare git. Il controllo delle skill parte solo quando il pannello si apre, o da Open Trama. Il quadro del progetto legge ogni file una sola volta e usa una cache per finestra, condivisa tra pannello e menu.
