---
column: done
technical: false
refs:
  - drift-resolution/Running tasks/agent.FINISH_CHECK
drift: df9zenrn
proposal: null
agent: false
created: 2026-10-16T12:46:29.170Z
finished: 2026-10-16T12:55:04.146Z
---
# Fix code to match the Model: Dopo un controllo finale fallito, il Run automatico continua su tutti i Task autorizzati

## What happens

Quando il controllo finale di un Run automatico dichiara un esito fallito, il sistema registra il fallimento ma **non ferma nulla**: il Run continua a ricevere tutti i Task ancora autorizzati e non conclusi, anche quelli che potrebbero dipendere dal lavoro che la verifica ha rotto. Nessuno dice quale lavoro l'ha rotta, quindi nessun Task viene trattenuto.

## What should happen

Il Modello dice che, dopo un controllo finale fallito, il Run **continua soltanto sui casi indipendenti** e la prosecuzione automatica compromessa resta ferma; le nuove raccolte, dopo la fine del Run, non sono sospese. I Requisiti tecnici dicono che una verifica finale fallita di origine incerta **sospende la prosecuzione automatica**. Poiché il lavoro che ha rotto la verifica non è noto, la sospensione deve valere, e le nuove raccolte restano libere.

## Chosen option

**Fermare la prosecuzione automatica del Run**

Dopo un controllo finale fallito, il Run non riceve più altri Task automatici: quelli non ancora conclusi restano in To do con il motivo del fallimento. Le nuove raccolte ripartono normalmente dopo la fine del Run. È la lettura più prudente del Requisito, perché il lavoro che ha rotto la verifica non è noto. Costo: i Task indipendenti non conclusi aspettano il developer anche quando non dipendono dal lavoro fallito.

## Where in the code

extension/src/host/drift-resolution.ts: la registrazione del controllo finale fallito di un Run automatico, che aggiunge solo un caso al Run senza fermarlo; extension/src/host/controller.ts: la funzione che decide quali Task restano autorizzati a un Run, che non tiene conto di quel fallimento.
