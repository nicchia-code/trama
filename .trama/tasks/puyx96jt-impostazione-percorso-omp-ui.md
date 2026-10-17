---
column: done
technical: true
refs:
  - requirements/ui#panel/Settings
drift: null
proposal: b006amix
agent: false
created: 2026-10-17T03:28:12.255Z
finished: 2026-10-17T03:39:25.373Z
---
# Impostazione del percorso di omp e motivo sotto i ruoli in Settings

Quando il Task è finito:

- Il gruppo `Agent` della scheda Settings mostra `trama.ompPath` subito dopo `trama.agent`, con il titolo `Omp Path`, la «i» informativa e un campo di testo su una riga.
- Con `trama.agent` uguale a `omp` e un elenco arrivato con `error`, sotto ciascuno dei tre campi `trama.analysis`, `trama.scan` e `trama.execution` compare una riga di testo secondario con il motivo, in inglese, esattamente come arriva dall'host.
- La riga sparisce quando arriva un elenco senza `error` o quando `trama.agent` non è più `omp`.
- Con Claude Code, con la chat, o senza errore, nessuna riga compare e la tendina resta com'è.
