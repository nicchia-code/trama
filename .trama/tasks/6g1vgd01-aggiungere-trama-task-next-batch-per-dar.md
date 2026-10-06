---
column: done
technical: false
refs:
  - task/To do
  - requirements/rules#task
  - requirements/tech#task
drift: null
proposal: rhfwtu3m
agent: false
created: 2026-10-06T10:45:28.157Z
---
# Aggiungere trama task next --batch per dare il gruppo di una corsa parallela

`trama task next --batch` dà, senza spostare nulla, il gruppo di una corsa parallela: partendo dal prossimo Task eseguibile e seguendo l'ordine dei Task eseguibili (il più vecchio prima), aggiunge ogni Task che non riguarda la stessa cosa di nessuno di quelli già scelti, con la stessa regola dei riferimenti che decide quali Task blocca un Drift, finché il gruppo ha quattro Task (massimo fisso) o non ne resta nessuno. Il primo è sempre quello che darebbe `trama task next`. Stampa un Task per riga con ID e titolo; accetta `--proposal <id>` con lo stesso significato e lo stesso rifiuto; quando nessun Task è eseguibile stampa esattamente ciò che stampa `trama task next`. Con `--json` dà la lista dei Task, ciascuno con `id` e `number`. Il calcolo sta nel nucleo condiviso.
