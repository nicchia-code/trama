---
column: done
technical: true
refs:
  - requirements/tech#General
  - requirements/tech#question-round
drift: null
proposal: null
agent: false
created: 2026-10-11T17:07:04.624Z
finished: 2026-10-11T17:22:31.936Z
---
# Accept a UTF-8 BOM on the JSON read by trama ask

`trama ask` accetta un BOM UTF-8 iniziale sul JSON letto da standard input e lo ignora prima di leggere il round: in Windows PowerShell 5.1 una pipe lo aggiunge e oggi la richiesta viene rifiutata come JSON non valido. Il Requisito generale vale per ogni comando che legge JSON da standard input, quindi anche per gli hook di Cursor e Copilot, che oggi in caso di errore rispondono comunque senza passare l'evento all'editor.
