---
status: approved
kind: resolution
drifts:
  - drift: ossgvrhd
    decision: fix-code
    option: 1
  - drift: 7lg81jlv
    decision: fix-code
    option: 1
base: {}
delete: []
created: 2026-10-10T19:14:20.319Z
---
# Resolve scan delivery and request title drifts

- ossgvrhd — Successful terminal scan still offers Scan now: correggere il codice con la prima opzione, riconoscendo come riuscite sia la consegna automatica alla chat sia quella al terminale; offrire Scan now soltanto quando la chat non ha inviato la scansione, mantenendo il recupero Copilot negli appunti.
- 7lg81jlv — Quoted code fence can suppress a real request title: correggere il codice con la prima opzione, terminando il blocco di codice quando termina la citazione o la lista che lo contiene, così il titolo esterno successivo viene riconosciuto; mantenere il riconoscimento mirato al titolo, con un limite esplicito per strutture Markdown meno comuni.
