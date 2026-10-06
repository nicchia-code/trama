---
status: resolved
resolution: fix-code
refs:
  - worktree-round/Reconciling/terminal.COMMAND_ENDED
  - requirements/quality#worktree-round
proposal: null
task: kdynz8az
origin: null
option: 1
note: null
created: 2026-10-06T18:49:54.317Z
---
# La riconciliazione unisce il giro con marcatori già committati

## What happens

Quando l’agente committa la riconciliazione lasciando marcatori di conflitto in un file sorgente e porta il Task in Done, Trama considera pronta l’unione. Il giro termina e il file con i **marcatori ancora presenti** entra nella cartella aperta. Lo scenario isolato ha prodotto un giro unito e ha ritrovato i marcatori nella cartella aperta.

## What should happen

Se il Task di riconciliazione è in Done ma nel worktree di merge restano marcatori di conflitto, il giro deve tornare in **Conflict**: nessun nuovo commit né tentativo di unione, il Task di riconciliazione sparisce, il Merge Drift torna da decidere e il developer è avvisato. La cartella aperta non deve mai ricevere i marcatori, neppure quando l’agente li ha già committati.

## Fix options

### Controllare tutto il risultato della riconciliazione

Prima di riprovare l’unione, cercare i marcatori anche nei file sorgente già committati durante la riconciliazione. Se ne rimane uno, riportare il giro in Conflict e lasciare intatta la cartella aperta. Mantiene il comportamento previsto e richiede un controllo del risultato completo, non soltanto delle modifiche ancora da committare.

### Verificare nuovamente il risultato prima di applicarlo

Effettuare anche una verifica finale del contenuto da trasferire nella cartella aperta. Un risultato con marcatori riapre il Merge Drift e richiede una nuova riconciliazione, senza toccare il branch aperto. Offre un punto di protezione ulteriore prima dell’applicazione; costa una verifica aggiuntiva e deve conservare il ritorno a Conflict previsto dal Modello.

## Where in the code

src/core/worktree-merge.ts: conflictMarkers, finishReconciliation, landReadyMerge
