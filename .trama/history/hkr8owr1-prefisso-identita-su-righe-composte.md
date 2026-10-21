---
created: 2026-10-21T12:04:17.999Z
updated: 2026-10-21T12:04:17.999Z
summary: Nelle righe di shell composte (`cd x && trama …`) l'hook di Cursor antepone `TRAMA_CHAT` e `TRAMA_JOB` a ogni invocazione di `trama`, senza più `export` che lasciava le variabili nella shell.
tasks:
  - cfxda7vs
---
# Prefisso identità su righe composte

Prima l'hook della chat completava una riga composta con `export TRAMA_CHAT=…; ` davanti a tutta la riga, e le variabili restavano nella shell della sessione. Ora il prefisso letterale `TRAMA_CHAT=… TRAMA_JOB=… ` sta davanti a ogni invocazione di `trama` della riga (anche dopo `&&`, `;`, `|` o in una sottoshell), come per la riga con un solo comando. Su Windows la riga comincia ancora con le assegnazioni `$env:`.
