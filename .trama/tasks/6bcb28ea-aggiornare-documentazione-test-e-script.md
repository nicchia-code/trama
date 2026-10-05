---
column: done
technical: false
refs:
  - panel/Board
  - task
  - requirements/ui#panel/Board
  - requirements/rules#task
  - requirements/tech#panel
drift: null
proposal: e87cbe8e
agent: false
created: 1970-01-01T00:00:00.132Z
---
# Aggiornare documentazione, test e script di accettazione per la Board di sola lettura

La documentazione descrive la Board come di sola lettura per i Task, e dice che alla fine del comando dell'agente i Task presi tornano in To do e che spostare e riprendere un Task sono solo della riga di comando. I test non verificano più i messaggi, il trascinamento e le frecce rimossi e coprono il rilascio verso To do e il rifiuto che cita solo `trama task take-back`. Lo script di accettazione non ha più i passi di spostamento con trascinamento o frecce, della scheda occupata e del bottone Take back, e verifica che la Board non offra nessun modo di spostare una scheda.
