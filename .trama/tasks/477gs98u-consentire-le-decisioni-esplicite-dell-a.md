---
column: done
technical: false
refs:
  - agent
  - requirements/rules#General
  - requirements/tech#General
drift: null
proposal: coum2clg
agent: false
created: 2026-10-10T13:06:50.847Z
finished: 2026-10-10T13:19:37.042Z
---
# Consentire le decisioni esplicite dell'agente secondo i Requisiti

Quando il developer chiede esplicitamente nella conversazione una decisione, l'agente può eseguire approve, reject, discard, drift resolve, task take-back o ids rewrite con gli stessi controlli e conseguenze previsti per il developer. Senza una richiesta esplicita, si ferma e chiede al developer di decidere. Le skill, la CLI e la documentazione descrivono questa regola senza rifiutare le decisioni solo perché il comando è eseguito dall'agente.
