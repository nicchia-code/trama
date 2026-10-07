---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#General
proposal: null
task: vuoyqhw2
origin: null
option: 1
note: null
created: 2026-10-07T15:20:29.981Z
---
# The editor calls Jev over the network although the General Requirements forbid network calls

## What happens

Con `trama.system1` impostata a `jev` e la chiave salvata, l'editor manda a TypeSafe, per ogni Machine smistata, lo stato preparato dall'agente: è una **chiamata di rete** verso un modello, come chiede la sezione `agent-launching` dei Requisiti tecnici.

## What should happen

La sezione **General** dei Requisiti tecnici dice ancora che Trama non chiama mai un modello linguistico e che **non effettua chiamate di rete** né telemetria. Le due sezioni si contraddicono: il codice non può rispettarle entrambe, e la sezione General non prevede l'eccezione del classificatore System 1 facoltativo che il Modello del System già descrive.

## Fix options

### Add the System 1 exception to the General Requirements

Una Proposal riscrive le due righe di `tech#General`: nessun modello che scrive testo e nessuna chiamata di rete, tranne il classificatore System 1 facoltativo, acceso dal developer e chiamato solo su richiesta dell'agente. Il codice resta com'è.

### Remove the Jev call from the editor

Il classificatore non chiama più TypeSafe e `trama classify` risponde sempre `unavailable`: lo smistamento lo fa sempre il modello di esecuzione. Si perde il risparmio di costo del classificatore e va cambiata anche la sezione `agent-launching`.

## Where in the code

extension/src/host/jev.ts (askJev), extension/src/host/system1.ts (classifyMachine)
