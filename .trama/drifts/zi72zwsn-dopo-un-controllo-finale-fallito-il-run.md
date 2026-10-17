---
status: resolved
resolution: fix-code
refs:
  - drift-resolution/Running tasks/agent.FINISH_CHECK
proposal: null
task: mc8wd1vj
origin: null
previous: 296dd3d9
critical: false
option: 1
note: null
resolvedBy: umxxpi2m
created: 2026-10-16T12:58:27.288Z
---
# Dopo un controllo finale fallito, il Run automatico ferma di nuovo anche i Task indipendenti

## What happens

Quando il controllo finale di un Run automatico dichiara un esito fallito, il sistema smette di autorizzare ogni altro Task di quel Run. Anche i Task indipendenti dal lavoro che la verifica ha rotto restano in To do, e quelli non ancora conclusi vengono segnati come falliti con il motivo del controllo finale.

## What should happen

Il Modello dice che, dopo un controllo finale fallito, il Run **continua soltanto sui casi indipendenti**: la prosecuzione automatica compromessa resta ferma, ma i Task indipendenti proseguono. Le nuove raccolte, dopo la fine del Run, non sono sospese. I Requisiti tecnici dicono che il lavoro indipendente può proseguire solo quando il fallimento è attribuito a un caso; con origine incerta la prosecuzione automatica si sospende.

## Fix options

### Far dichiarare al Run il Task che ha rotto la verifica

Il Run dichiara, insieme al controllo finale fallito, quale Task ha rotto la verifica, con la stessa segnalazione usata per un Task fallito. Solo quel Task e quelli che ne dipendono si fermano; gli indipendenti proseguono. Se il Run non sa attribuire il fallimento, la prosecuzione si ferma come oggi. Costo: l'agente deve riconoscere il Task responsabile, e un'attribuzione sbagliata può fermare lavoro indipendente o far partire lavoro dipendente.

### Attribuire il fallimento al developer prima di riprendere

Dopo un controllo finale fallito il Run si ferma come oggi. Il developer indica quale Task ha rotto la verifica, oppure che non lo sa. Solo con quell'indicazione il Run riprende sui casi indipendenti, con la stessa autorizzazione di prima. Costo: ogni verifica fallita richiede un intervento a mano, e il lavoro indipendente aspetta il developer.

## Where in the code

extension/src/host/controller.ts: authorizedCollectionTasks, il ramo che non autorizza alcun Task quando il controllo finale del Run è fallito; advanceCollection, il ramo che segna come falliti i Task non conclusi di quel Run. extension/src/host/drift-resolution.ts: receiveCheck e recordRunFailure, che registrano il controllo finale fallito solo come un caso del Run, senza un Task responsabile.
