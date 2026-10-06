---
status: approved
base:
  requirements/ui/agents.md: c7f9354692c3de92f478e57f9ad7c4582f4c56c3f5a4abcd6f061af8dcecacc2
delete: []
created: 2026-10-06T17:40:58.372Z
scanScope:
  - ref: requirements/ui#worktree-round
    reason: changed
---
# Rifiuto dell'accettazione multi-branch fuori da un branch

Il Drift sul rifiuto fuori da un branch è stato risolto scegliendo di mantenere il rifiuto e di aggiungerlo ai Requisiti. Con l'interruttore multi-branch acceso, il giro deve ricordare il branch di partenza per tornarci all'unione: se la cartella aperta non è su un branch (HEAD staccato), l'accettazione è rifiutata.

Scelte da verificare (nessuna intervista, Proposal legata a un Drift):
- Il testo del rifiuto è quello già mostrato dal codice: `This folder is not on a branch, so a worktree cannot be created.`
- Il rifiuto si aggiunge all'elenco dei rifiuti di `requirements/ui#worktree-round`, subito dopo quello della cartella che non è un repository Git.
- Il Model non cambia: la Transizione da No round su `developer.APPROVE_PROPOSAL` vale già solo quando l'accettazione apre davvero un worktree.
