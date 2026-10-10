---
status: resolved
resolution: fix-code
refs:
  - drift-resolution/Running tasks
  - drift-resolution/Resolving
  - requirements/rules#drift-resolution
proposal: null
task: xyjqrrqw
origin: null
option: 1
note: null
resolvedBy: 5mztm9sl
created: 2026-10-10T12:48:26.584Z
---
# L'inattività conclude Run e risoluzioni senza un evento di fine

## What happens

Un Run o Resolve Drifts può essere considerato finito dopo quindici minuti senza attività, anche quando il suo agente non ha riferito la fine. Succede per i terminali con hook, i terminali senza una fine osservabile e le chat non ancora legate a una conversazione. I comandi di Trama riavviano questa attesa e un round di domande la sospende. Il ritorno a Free può quindi rendere disponibile il lavoro incompatibile mentre quello precedente non risulta concluso.

## What should happen

Running tasks e Resolving devono terminare soltanto con un evento di fine del lavoro interessato: riposo riferito dall’agent-hook, fine del comando inviato o chiusura del terminale; nella chat, fine turno, interruzione o chiusura della conversazione associata. Nessun timer e nessun comando di Trama devono decidere quando un lavoro finisce. Un lavoro senza un segnale osservabile resta in corso fino alla chiusura pertinente o alla riapertura dell’editor. Con più Run, Free si raggiunge soltanto quando sono finiti tutti.

## Fix options

### Eliminare la conclusione per inattività

Rimuovere la quiete dalla durata dei Run e di Resolve Drifts, lasciando soltanto gli eventi di fine previsti. Anche senza hook un lavoro non viene dichiarato concluso per il tempo trascorso. È il taglio più semplice; quando manca un segnale di fine il developer deve chiudere il terminale o la conversazione, oppure riaprire l’editor.

### Segnalare il blocco senza terminare il lavoro

Eliminare comunque ogni conclusione automatica per inattività e aggiungere un avviso quando un lavoro non riceve segnali di fine. Il lavoro resta in corso e l’esclusione fra Run e risoluzione rimane valida finché il developer chiude il contenitore. Richiede disegnare l’avviso e le sue regole, ma aiuta a capire perché i pulsanti restano disabilitati.

## Where in the code

extension/src/host/drift-resolution.ts: endQuietJobs, watchQuietJobs, noteActivity; extension/src/host/main.ts: activate; extension/src/host/questions.ts: onActivity e onAgentAlive
