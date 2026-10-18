---
created: 2026-10-18T09:23:45.013Z
updated: 2026-10-18T09:23:45.013Z
summary: Il job della chat parte nel momento in cui la consegna invia il testo; job e annuncio si ritirano insieme se la consegna non riesce.
tasks:
  - mvgqt2gl
  - yo13uz7n
---
# Job e annuncio della chat al click

Il job di un lavoro lanciato in chat parte subito prima del passo che invia da solo il testo (composer.createNew in Cursor, workbench.action.chat.open in VS Code), non dopo il ritorno del comando. L'annuncio della chat viene scritto nello stesso punto. Se il passo fallisce o la consegna non è sent, job e annuncio si ritirano senza avviso, il job finisce subito senza esito anomalo per l'autopilot e le altre finestre vengono avvisate.
