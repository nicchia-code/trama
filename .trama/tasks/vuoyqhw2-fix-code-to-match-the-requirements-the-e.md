---
column: done
technical: true
refs:
  - requirements/tech#General
drift: 98frztb7
proposal: null
agent: false
created: 2026-10-07T16:08:06.914Z
finished: 2026-10-07T16:09:45.828Z
---
# Fix code to match the Requirements: The editor calls Jev over the network although the General Requirements forbid network calls

## What happens

Con `trama.system1` impostata a `jev` e la chiave salvata, l'editor manda a TypeSafe, per ogni Machine smistata, lo stato preparato dall'agente: è una **chiamata di rete** verso un modello, come chiede la sezione `agent-launching` dei Requisiti tecnici.

## What should happen

La sezione **General** dei Requisiti tecnici dice ancora che Trama non chiama mai un modello linguistico e che **non effettua chiamate di rete** né telemetria. Le due sezioni si contraddicono: il codice non può rispettarle entrambe, e la sezione General non prevede l'eccezione del classificatore System 1 facoltativo che il Modello del System già descrive.

## Chosen option

**Add the System 1 exception to the General Requirements**

Una Proposal riscrive le due righe di `tech#General`: nessun modello che scrive testo e nessuna chiamata di rete, tranne il classificatore System 1 facoltativo, acceso dal developer e chiamato solo su richiesta dell'agente. Il codice resta com'è.

## Where in the code

extension/src/host/jev.ts (askJev), extension/src/host/system1.ts (classifyMachine)
