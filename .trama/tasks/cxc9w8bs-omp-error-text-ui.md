---
column: done
technical: false
refs:
  - panel/Settings
  - requirements/ui#panel/Settings
drift: null
proposal: bm5blcga
agent: false
created: 2026-10-17T06:30:19.774Z
finished: 2026-10-17T06:58:23.654Z
---
# Riga di errore di omp con il testo nuovo

Con `trama.agent` su `omp`, quando l'elenco arriva con un errore, sotto ciascuno dei tre campi (`trama.analysis`, `trama.scan`, `trama.execution`) compare la riga di testo secondario con il motivo: `omp not found at <percorso>`, `omp models did not answer within 15 s`, `omp exited with code <N>` o `omp models did not return a valid list`. La riga sparisce quando arriva un elenco senza errore o quando `trama.agent` non è più `omp`. Il testo «omp models did not return a valid list» non compare più per un exit code diverso da 0.
