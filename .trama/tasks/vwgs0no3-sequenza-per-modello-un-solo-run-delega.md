---
column: done
technical: false
refs:
  - drift-resolution/Running tasks
  - drift-resolution/Free/developer.ASK_AGENT
  - drift-resolution/In attesa delle scansioni/developer.ASK_AGENT
  - drift-resolution/Resolving/agent-hook.IDLE
  - drift-resolution/Resolving/terminal.COMMAND_ENDED
  - drift-resolution/Resolving/editor-chat.AGENT_STOPPED
drift: null
proposal: znzyo6iv
agent: false
created: 2026-10-17T17:38:35.278Z
finished: 2026-10-17T18:23:22.948Z
---
# La sequenza per modello conta come un solo Run per la delega dei Drift

Una sequenza di Run per modello, nata da Run all o dal Run automatico delle correzioni e delle loro origini, conta come un solo Run nel coordinamento della risoluzione dei Drift. Per tutta la durata della sequenza il progetto resta in Running tasks: Resolve Drifts e le nuove raccolte automatiche aspettano come per qualunque Run in corso.

La fine di un Run della sequenza che lascia partire il Run successivo non è la fine dell'ultimo Run: non porta a Free né a In attesa delle scansioni, non rivaluta il progetto e non fa partire nessuna raccolta. Vale come fine dell'ultimo Run soltanto la fine del Run finale della sequenza, oppure l'arresto della sequenza; solo allora valgono le uscite da Running tasks verso Free o verso In attesa delle scansioni, alle loro condizioni consuete (scan ancora in corso o no, delega attiva).

Nel Run automatico una correzione sta sempre nello stesso gruppo della sua origine, perché appartiene alla stessa Proposal, o a nessuna come lei; così un'origine non resta mai in un gruppo senza la correzione che la sblocca.

Le Transition che avviano un Run entrano in Running tasks anche quando il Run è una sequenza per modello: un Run manuale chiesto da Free o da In attesa delle scansioni (`developer.ASK_AGENT`), e il Run automatico che parte quando l'agente della risoluzione ha finito (`agent-hook.IDLE`, `terminal.COMMAND_ENDED`, `editor-chat.AGENT_STOPPED` da Resolving).
