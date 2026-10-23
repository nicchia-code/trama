---
created: 2026-10-23T09:20:54.978Z
updated: 2026-10-23T09:20:54.978Z
summary: "L'Advisor della chat di Cursor rivede le modifiche con round di trama-advisor in background: Cursor consegna l'esito, l'agente aspetta solo la revisione del Task e quella finale."
tasks:
  - e0fp573f
  - q6eqvoqj
  - zi0zqcft
---
# Advisor della chat in background

I round di revisione continua partono in background (`run_in_background`) con la trascrizione dell'agente da una posizione in byte; le note dei round stanno solo in memoria e tornano all'agente nella revisione del Task o finale, e la fase Note in attesa non esiste più. Esiste una sola definizione del sotto-agente trama-advisor. Il test di accettazione R di docs/uat.md controlla i round in background e dichiara Cursor 3.27.6 come prima versione provata.
