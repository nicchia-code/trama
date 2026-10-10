---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#proposal
proposal: null
task: gvp7n22w
origin: null
option: 1
note: null
resolvedBy: 5mztm9sl
created: 2026-10-10T12:56:35.188Z
---
# Scan instructions still triage Machines before comparison

## What happens

La procedura della scansione richiede ancora un **triage per ogni Machine** e consulta il classificatore prima del confronto. Le Machine dichiarate senza conflitto vengono saltate; solo quelle in conflitto passano all’analisi approfondita. Con sotto-agenti, separa smistamento e confronto e impone un limite fisso di venti, invece del limite ricevuto nell’istruzione. Anche il resoconto deve contare Machine saltate ed errori del classificatore. Questa procedura resta nella skill distribuita e in quella installata.

## What should happen

La scansione deve confrontare **direttamente ogni Machine dell’ambito** con Modello, Requisiti e codice, senza smistamento preliminare né classificatore. Quando sono disponibili sotto-agenti, ogni Machine va al sotto-agente di confronto trama-analysis, che legge la vista completa, annuncia e archivia le proprie schede e torna al principale. Il massimo contemporaneo è N dell’istruzione, oppure venti se manca. General e sezioni senza Machine restano al principale, che scrive l’unico resoconto.

## Fix options

### Riscrivere la fase di suddivisione senza triage

Sostituire il triage con l’assegnazione diretta di tutte le Machine ai rispettivi confronti, mantenendo la ricerca del codice, la lettura completa e l’archiviazione delle schede. Usare il limite ricevuto e rimuovere dal resoconto i risultati del classificatore. Nessuna Machine viene più saltata; il costo è aggiornare insieme la procedura distribuita e le copie installate.

### Unificare ricerca e confronto per ogni Machine

Organizzare la scansione come una sola sequenza per Machine: trovare il codice, leggere la vista completa, confrontare e archiviare. Quando esistono sotto-agenti, affidare a ciascuno quella sequenza, con il limite dell’istruzione; altrimenti eseguirla direttamente. Elimina anche la distinzione fra triage e confronto nella struttura delle istruzioni. Il costo è una riscrittura più ampia della procedura, mantenendo ambito e resoconto unico.

## Where in the code

skills/trama-scan/SKILL.md: Steps 3 e 8; .agents/skills/trama-scan/SKILL.md: stessa procedura installata.
