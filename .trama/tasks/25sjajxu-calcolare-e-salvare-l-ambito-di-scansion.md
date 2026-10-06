---
column: done
technical: false
refs:
  - proposal/Approved
  - proposal/Open/developer.APPROVE_PROPOSAL
  - proposal/In worktree
  - requirements/rules#proposal/Approved
  - requirements/data#proposal
  - requirements/tech#proposal
drift: null
proposal: rhfwtu3m
agent: false
created: 2026-10-06T10:45:27.139Z
---
# Calcolare e salvare l'ambito di scansione quando una Proposal è approvata o entra in un worktree, e mostrarlo in trama proposal show

Quando una Proposal ordinaria è approvata (direttamente o accettando la Proposal di un Drift) o entra in un worktree, Trama calcola dal Modello e dai Requisiti di prima e di dopo il suo ambito di scansione e lo salva con la Proposal nel campo `scanScope`: ogni State, Transition ed Event aggiunto o cambiato con ciò che contiene; la descrizione cambiata di una Machine, Feature o Actor da sola; ogni sezione di Requisiti aggiunta o cambiata (una sezione General da sola, gli spostamenti fra frammenti non contano); le Transitions di qualunque Machine che entrano in questi elementi o reagiscono a un loro Event cambiato; una Machine nuova intera; un elemento tolto con il contenitore più vicino che esiste ancora. Ogni voce ha `ref` nella forma di `--ref` e `reason` (`changed`, `removed, its container`, `leads into a change`). L'ambito non cambia più dopo, nemmeno quando la Proposal di un worktree arriva nel Modello con l'unione; manca nelle import, nelle Proposal non approvate e in quelle approvate prima. `trama proposal show <id>` lo stampa nella sezione `## Scan scope`, un riferimento per riga con la sua nota; con `--json` è il campo `scanScope`, lista di `{ ref, reason }`. Le Feature toccate continuano a decidere solo se la scansione automatica parte.
