---
status: rejected
base:
  editor-panel/panel.md: 0c69d9285ccd595fa46505841f5cafc451a48e7a6073ee28819d1c95916489dc
  agent-launching/design-request.md: 31e960cad765494f216de61efe3c90829ec40c7a2b87b0b528103f1fb57ceb00
  agent-launching/feature.md: 42a1cda75b9d41d322b5216f67ff74ed91124337cb8bb03b7a159fd2ae0acf6e
  requirements/ui/agents.md: e8342eb332087ff09f8e2a4d8229c5d8cdae89a1a7e6db5d6a86515d8df2d32d
  requirements/ui/board.md: 07b0436bdf425eac5f0007a52984c1a0c04d371445713dc34c329a54fc123887
  requirements/ui/work.md: 842f4f740961c6c2144f77e463db71d4236257e48bdb260e1513713299712cf6
  requirements/tech/project-panel.md: 754387fd14376e401a426e2bebf06f83a0112bfc3d0ba9d393376bbf5f89b01e
  requirements/tech/requests.md: b680d12de01fc3993641f4bde917d938184588a0f95156fe2b10a3d1814e1bac
  requirements/data/agents.md: 2ae01c6395280f290517316c8555526ff862e98888351fbc3b9efa2179512841
delete: []
created: 2026-10-16T18:25:35.056Z
---
# Board: + Work Item e Run all solo nelle colonne

Il developer vuole un solo punto per ciascuna delle due azioni: + Work Item soltanto in fondo alla colonna Work Items e Run all soltanto in fondo alla colonna Ready. La barra della Board perde i gemelli Add Work Item… e Run Ready Tasks.

Decisioni:
- La barra della Board perde Add Work Item… e Run Ready Tasks; restano Resolve Drifts, Scan System e Quick request…, in quest'ordine.
- Resolve Drifts diventa il primo pulsante della barra.
- Nessun pulsante della barra è pieno nel colore primario; il solo pulsante primario della Board resta Run all.
- Il Run di tutti i Task Ready continua a chiamarsi Run Ready Tasks: nome accessibile e tooltip da abilitato di Run all, descrizione di trama.submitWhileRunning, rifiuto dell'host, regole dei Task, titoli dei controlli e avvio dopo il setup non cambiano.
- + Work Item tiene il tooltip «Write a work item in Markdown and send it to an agent» e il nome accessibile «Add Work Item»; è l'unico pulsante della Board che apre una richiesta di design scritta.

## Already present
- `agent-launching` — `+ Work Item` crea e apre la richiesta scritta: `footButtons()` in `extension/src/webview/board/index.ts` manda `writeDesignRequest`, gestito in `extension/src/host/controller.ts` con `designRequests.write()`
- `design-request` — creazione del file da `+ Work Item` e da Start from Scratch in `extension/src/host/design-requests.ts`; nessun altro punto la crea una volta tolto il pulsante della barra (Task della Board)
- `requirements/data#design-request` — `extension/src/host/design-requests.ts` (ID, cartella `requests/` e `.gitignore`)
- `requirements/tech#design-request` — `extension/src/host/design-requests.ts` (`write()` e `writeSetup()` con `showTextDocument`)
- `panel/Open/developer.SHOW_BOARD` — Transition invariata, `extension/src/webview/board/index.ts` (`mountBoard`)

## Feedback

Nella colonna Work items ci deve essere SOLO + Work Item (e non run All) nella colonna ready ci deve ssere SOLO run all (e non + work item). La barra di stato sopra è da tenre com e
