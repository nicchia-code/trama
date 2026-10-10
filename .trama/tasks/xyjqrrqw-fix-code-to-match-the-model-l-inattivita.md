---
column: done
technical: false
refs:
  - drift-resolution/Running tasks
  - drift-resolution/Resolving
  - requirements/rules#drift-resolution
drift: q0ah0ztc
proposal: null
agent: false
created: 2026-10-10T14:15:26.781Z
finished: 2026-10-10T16:50:38.780Z
---
# Fix code to match the Model: L'inattività conclude Run e risoluzioni senza un evento di fine

## What happens

Un Run o Resolve Drifts può essere considerato finito dopo quindici minuti senza attività, anche quando il suo agente non ha riferito la fine. Succede per i terminali con hook, i terminali senza una fine osservabile e le chat non ancora legate a una conversazione. I comandi di Trama riavviano questa attesa e un round di domande la sospende. Il ritorno a Free può quindi rendere disponibile il lavoro incompatibile mentre quello precedente non risulta concluso.

## What should happen

Running tasks e Resolving devono terminare soltanto con un evento di fine del lavoro interessato: riposo riferito dall’agent-hook, fine del comando inviato o chiusura del terminale; nella chat, fine turno, interruzione o chiusura della conversazione associata. Nessun timer e nessun comando di Trama devono decidere quando un lavoro finisce. Un lavoro senza un segnale osservabile resta in corso fino alla chiusura pertinente o alla riapertura dell’editor. Con più Run, Free si raggiunge soltanto quando sono finiti tutti.

## Chosen option

**Eliminare la conclusione per inattività**

Rimuovere la quiete dalla durata dei Run e di Resolve Drifts, lasciando soltanto gli eventi di fine previsti. Anche senza hook un lavoro non viene dichiarato concluso per il tempo trascorso. È il taglio più semplice; quando manca un segnale di fine il developer deve chiudere il terminale o la conversazione, oppure riaprire l’editor.

## Where in the code

extension/src/host/drift-resolution.ts: endQuietJobs, watchQuietJobs, noteActivity; extension/src/host/main.ts: activate; extension/src/host/questions.ts: onActivity e onAgentAlive
