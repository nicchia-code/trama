---
column: done
technical: true
refs:
  - requirements/tech#General
drift: lhgpxm7v
proposal: null
agent: false
created: 2026-10-07T16:09:18.621Z
finished: 2026-10-07T16:09:39.602Z
---
# Fix code to match the Requirements: General Requirements still forbid the network call to the System 1 classifier

## What happens

L'editor chiama il classificatore **System 1** (Jev di TypeSafe) in rete, come chiedono il Modello del System e la sezione `agent-launching` dei Requisiti tecnici. Il Task chiede di adeguare il codice alla sezione **General**, ma l'opzione scelta nel Drift che l'ha generato era proprio lasciare il codice com'è e correggere i Requisiti, e quella correzione non è mai stata scritta.

## What should happen

La sezione **General** dice ancora che Trama non chiama mai un modello linguistico e non fa chiamate di rete. Togliere la chiamata a Jev violerebbe il Modello del System e la sezione `agent-launching`; lasciarla viola General. Il codice non può rispettare entrambe: serve prima che i Requisiti prevedano l'eccezione.

## Chosen option

**Approve the Proposal that adds the System 1 exception**

La Proposal allegata riscrive le due righe di `tech#General`: nessun modello che scrive testo e nessuna chiamata di rete, tranne il classificatore System 1 facoltativo acceso dal developer. Il codice resta com'è e questo Task non ha più lavoro da fare. Costo: nessuno nel codice.

## Where in the code

extension/src/host/jev.ts (askJev), extension/src/host/system1.ts (classifyMachine)
