---
status: approved
kind: resolution
automatic: true
drifts:
  - drift: icprjc4t
    decision: fix-code
    option: 1
  - drift: 4b9ji8ya
    decision: fix-code
    option: 1
  - drift: kru3ylyg
    decision: fix-code
    option: 1
base: {}
delete: []
created: 2026-10-11T06:58:20.847Z
---
# Resolve agent terminal and Diagram Scan Drifts

Risoluzione automatica dei Drift autorizzati, ciascuno con la prima opzione di correzione:

- icprjc4t – An idle agent terminal is still followed by Trama: correggere il codice, Trama smette di seguire un terminale quando l'agente diventa inattivo.
- 4b9ji8ya – Instructions of tracked jobs in a terminal are still two paragraphs: correggere il codice, l'istruzione nel terminale resta di una riga e i comandi ricavano il job dall'ambiente del terminale.
- kru3ylyg – Diagram Scan button shows the finished-Tasks number at Machine and State levels: correggere il codice, ai livelli Machine e State il pulsante mostra l'etichetta semplice e il tooltip della Feature.
