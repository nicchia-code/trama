---
column: done
technical: false
refs:
  - drift-resolution/Free
  - requirements/tech#drift-resolution
drift: null
proposal: null
agent: false
created: 2026-10-14T16:25:19.363Z
finished: 2026-10-14T17:09:13.644Z
---
# Remember a System scan started from the Scan command

Quando il developer lancia lo scan di tutto il Sistema dal comando Trama: Scan, il ricordo dell ultimo scan globale (.trama/last-scan/system) si aggiorna al lancio come per il pulsante Scan, così il conteggio dei Task finiti riparte anche da questo comando. Oggi il comando non passa per il pulsante e il ricordo resta invariato.
