---
column: done
technical: false
refs:
  - requirements/tech#scan-hold
  - scan-hold/On/proposal.APPROVED
drift: 86o9gooo
proposal: null
agent: false
created: 2026-10-10T11:14:40.585Z
finished: 2026-10-10T11:16:58.344Z
---
# Fix code to match the Model: Hold scan decides entry without reading the Proposal's saved scan scope

## What happens

Quando una Proposal ordinaria è approvata con Hold scan acceso, la decisione se entra nel sospeso guarda **solo le Feature toccate**, ricalcolate dai file che la Proposal cambia, come per la scansione automatica. Non legge mai l'**ambito di scansione salvato** con la Proposal al momento dell'approvazione.

Così una Proposal il cui ambito non ha nessun riferimento dentro una Feature esistente (per esempio un file di Machine cambiato senza toccare States, Transitions o descrizioni) entra comunque nel sospeso e fa crescere il contatore. L'ambito salvato viene letto solo quando il developer spegne l'interruttore, e solo lì la Proposal viene scartata con l'avviso che non c'era nulla da scansionare.

## What should happen

Il Requisito `tech#scan-hold` dice che la decisione se una Proposal entra nel sospeso usa il suo **ambito di scansione salvato** (`scanScope`) **e** lo stesso calcolo delle Feature toccate della scansione automatica, in `src/core`.

Quindi, oltre alle condizioni della scansione automatica (modifica ordinaria, `trama.autoScan` acceso, almeno una Feature toccata che esiste ancora), l'ingresso nel sospeso dovrebbe tenere conto dell'ambito salvato della Proposal: una Proposal il cui ambito non riguarda nessuna Feature esistente non dovrebbe entrare nel sospeso né far crescere il contatore.

## Chosen option

**Leggere l'ambito salvato all'ingresso**

Dopo l'approvazione, la decisione condivisa in `src/core` richiede, oltre alle Feature toccate, che l'ambito salvato abbia almeno un riferimento dentro una Feature esistente, con la stessa regola già usata allo spegnimento. Il contatore conta solo Proposal che daranno davvero qualcosa da scansionare. Costo: una piccola modifica nel percorso comune a pannello e riga di comando, più un test.

## Where in the code

`approvedScope` in src/core/scope.ts (entry decision, file-based Features only); `holdApproved` in src/core/scan-hold.ts; callers in extension/src/host/approval.ts and extension/src/host/controller.ts (`scanApproved`); the saved scope is read only by `heldToScan` in src/core/scan-hold.ts
