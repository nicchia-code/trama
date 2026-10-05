---
column: done
technical: false
refs:
  - proposal
  - task
  - drift
  - requirements/rules#General
  - requirements/tech#General
drift: null
proposal: 2pqy2i0g
agent: false
created: 2026-10-05T10:04:46.134Z
---
# Accettare il numero breve come argomento di ogni comando

Ogni comando che nomina una Proposal, un Task o un Drift accetta, oltre all'identità permanente, al prefisso univoco e al nome del file, il numero breve (`T3`, anche `t3`), compresi i comandi riservati al developer (approve, reject, discard, risolvere un Drift, take-back). Un argomento fatto da una sola lettera `P`, `T` o `D` seguita da cifre è sempre un numero breve, mai il prefisso di un'identità. Il comando è rifiutato senza cambiare nulla, spiegando perché, quando la lettera non è quella del tipo atteso (`T3` dato a un comando di Proposal) o quando nessuna scheda viva ha quel numero. Il numero si converte nell'identità permanente prima di scrivere qualunque cosa: nomi di file e cartelle, campi (`requires`, `proposal`, `drift`, `task`, `origin`, `refs`), branch `trama/<id>`, istruzioni inviate all'agente e testi scritti nei file (come «Replaced by Proposal <id>») usano sempre l'identità permanente.
