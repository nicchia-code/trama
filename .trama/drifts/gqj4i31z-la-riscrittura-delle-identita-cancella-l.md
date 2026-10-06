---
status: resolved
resolution: fix-code
refs:
  - requirements/rules#project
  - project/Trama project/developer.REWRITE_IDENTITIES
proposal: null
task: ngo6u8je
origin: null
option: 1
note: null
created: 2026-10-06T13:51:43.708Z
---
# La riscrittura delle identità cancella l'ambito di scansione delle Proposal

## What happens

Quando il developer riscrive le identità, ogni Proposal che Trama riscrive perde il suo **ambito di scansione**: sia la Proposal numerata che riceve l'identità nuova, sia una Proposal con identità propria che richiede una Proposal numerata.

Dopo il comando, una Proposal approvata non ricorda più quali riferimenti la sua scansione deve confrontare, e una scansione mirata ricade sulle Feature intere.

## What should happen

La riscrittura cambia solo il nome, l'istante di creazione e i riferimenti fra schede elencati (`requires` di una Proposal, ecc.). **Ogni altro dato della scheda resta com'è**: lo stato di ciascuna scheda non cambia e non si tocca nient'altro.

## Fix options

### Conservare ogni dato della Proposal

La riscrittura scrive di nuovo la Proposal con tutti i suoi dati, ambito di scansione compreso, cambiando solo identità, istante di creazione e `requires`. Correzione piccola e locale; conviene un controllo che una Proposal riscritta resti uguale in tutto il resto.

### Riusare il salvataggio comune delle Proposal

La riscrittura passa dallo stesso salvataggio che usano gli altri comandi sulle Proposal, invece di averne uno suo. Un campo aggiunto in futuro non si perde più in questo comando; costa toccare un punto condiviso e verificare che il salvataggio comune accetti le Proposal ancora numerate senza istante di creazione.

## Where in the code

src/core/rewrite-ids.ts, writeProposal (non riscrive scanScope; confronta con save in src/core/proposals.ts)
