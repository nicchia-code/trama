---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#proposal
proposal: null
task: w6jq1fh6
origin: null
option: 1
note: null
resolvedBy: 5mztm9sl
created: 2026-10-10T12:56:10.661Z
---
# Design exploration still caps sub-agents at four

## What happens

Nell’esplorazione precedente al primo round di design, le istruzioni consentono **al massimo quattro sotto-agenti contemporanei**, indipendentemente dal limite scritto nell’istruzione di Trama. Anche con più parti indipendenti della richiesta, l’agente deve rispettare questo tetto fisso. La skill sorgente contiene questa regola, quindi aggiornare le skill continua a distribuirla.

## What should happen

L’esplorazione del design deve affidare ai sotto-agenti le parti della richiesta prima del primo round, con **il limite N dell’istruzione di Trama**, non con un tetto autonomo di quattro. Se l’istruzione non indica N, il limite è venti. Ogni sotto-agente torna con ciò che esiste e ciò che cambierebbe; il principale riunisce i risultati e conduce da solo l’intervista e la scrittura della Proposal.

## Fix options

### Sostituire il tetto fisso nella fase di esplorazione

Conservare la fase di esplorazione e i suoi incarichi, sostituendo il limite di quattro con quello ricevuto da Trama e con venti quando manca. Il design può così usare il parallelismo scelto dal developer, senza cambiare chi conduce l’intervista. Il costo è aggiornare la skill distribuita e le sue copie installate, mantenendo esplicito il limite applicabile.

### Dichiarare un limite comune per tutto il design

Descrivere all’inizio delle istruzioni di design un’unica regola di delega: ogni esplorazione usa N dell’istruzione, oppure venti se assente. Togliere il tetto specifico dalla fase prima del round e farla richiamare questa regola. Il comportamento resta quello richiesto, ma il costo è riorganizzare le istruzioni per evitare che altre fasi interpretino un limite diverso.

## Where in the code

skills/trama-design/SKILL.md: Steps, Explore before asking, With sub-agents; .agents/skills/trama-design/SKILL.md: istruzioni installate.
