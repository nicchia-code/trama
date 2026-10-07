---
column: done
technical: false
refs:
  - scan-hold
  - scan-hold/Off
  - scan-hold/On
  - panel/Open
  - requirements/data#scan-hold
  - requirements/tech#scan-hold
drift: null
proposal: u935y83q
agent: false
created: 2026-10-07T05:20:41.157Z
finished: 2026-10-07T05:23:04.562Z
---
# Ricordare l'interruttore Hold scan e le Proposal in sospeso nella cartella di questa copia di lavoro

L'interruttore Hold scan e il sospeso vivono in `.trama/scan-hold/`, non versionata, con il suo `.gitignore` (`*`) scritto insieme al primo file: `state` (`on`/`off`, al più un a capo finale) e `held` (identità permanenti delle Proposal in sospeso, una per riga, dalla più vecchia). Cartella o `state` assenti: spento e sospeso vuoto; `held` assente: sospeso vuoto; `state` che non è `on` né `off`: spento, `held` non conta, e il developer va avvisato (lettura illeggibile distinguibile). Righe vuote, ripetute o che non nominano una Proposal approvata non contano e spariscono alla scrittura successiva; il contatore è il numero di righe valide. Ogni scrittura di `held` passa da un file provvisorio rinominato. Nessuna impostazione dell'estensione per Hold scan. Il quadro del pannello (snapshot) porta lo stato dell'interruttore, il numero in sospeso e l'eventuale illeggibilità, e si aggiorna quando cambia solo quella cartella, anche da un'altra finestra.
