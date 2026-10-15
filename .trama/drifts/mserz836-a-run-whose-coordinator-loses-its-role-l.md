---
status: resolved
resolution: fix-code
refs:
  - requirements/quality#drift-resolution
  - drift-resolution/Running tasks
proposal: null
task: 2tq4c3si
origin: null
critical: false
option: 1
note: null
resolvedBy: zg1i0cej
created: 2026-10-14T12:37:20.461Z
---
# A Run whose coordinator loses its role leaves its unfinished Tasks without a reason

## What happens

Se il coordinatore del progetto perde il suo ruolo mentre un Run automatico lavora, oppure se il developer ritira la delega durante quel Run, la raccolta in corso viene dimenticata senza annotazioni. I Task della correzione e le loro origini che non sono ancora Done restano nella loro colonna senza alcun motivo, come se nessuno li avesse mai autorizzati. Lo stesso accade al Run quando la finestra del coordinatore viene chiusa.

## What should happen

Quando la raccolta automatica si interrompe per perdita del coordinatore o per ritiro della delega, il Requisito di affidabilità chiede che restino i file e le decisioni già applicate, con un **motivo visibile** per ciò che richiede intervento. I Task rimasti non Done devono quindi riportare il motivo, come accade già per una finestra chiusa durante un Run automatico.

## Fix options

### Segnare i Task rimasti al momento dell'interruzione

Quando il coordinatore perde il ruolo o la delega viene ritirata durante un Run, i Task della correzione e le origini non Done ricevono subito il motivo visibile sulla Board, come per una finestra chiusa. Le decisioni già applicate restano. Costo: la finestra che perde il ruolo deve avvisare prima di sparire; se chiude di colpo, il motivo arriva solo quando il nuovo coordinatore ricorda il lavoro.

### Motivo generico alla fine del Run

Quando un Run automatico finisce senza più un coordinatore che ricordi la raccolta, i suoi Task non Done ricevono un motivo unico, del tipo raccolta interrotta, senza distinguere la causa. Le decisioni già applicate restano. Costo: il developer sa che qualcosa si è fermato, ma non se è stata la perdita del ruolo o il ritiro della delega.

## Where in the code

extension/src/host/controller.ts (coordinate: il ramo che azzera la raccolta quando la finestra non è più coordinatore o la delega è disabled; dispose)
