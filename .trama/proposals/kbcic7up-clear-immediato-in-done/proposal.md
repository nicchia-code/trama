---
status: approved
base:
  requirements/ui/history.md: 9747a17115ad2c5191dc5311eb48f1963a715f52cf93f92160039bb85f92c9c4
  requirements/tech/history.md: fb69844237718534f4e6fa31c94774cea29993b8975fe8d3e5cd5eb9b569248a
  requirements/quality/main.md: 0e62386dca92695812ec3567430b402d33a1403ce666a3cbcf83266ea3ef6ea4
delete: []
created: 2026-10-24T13:06:10.773Z
label: Clear Done
---
# Clear immediato in Done

Premendo Clear la colonna Done sembra non pulirsi. Clear in realtà cancella i Task, ma lentamente: su questo progetto, con 336 Task in Done, ha impiegato 15,5 s, perché per ogni Task rilegge tutte le Proposal (circa 70 ms) e tutta la History (circa 18 ms). Intanto l'host dell'estensione è bloccato e la Board non cambia, quindi sembra che non succeda nulla.

## Decisioni

- Nessun obiettivo numerico di tempo: Clear legge Proposal, History e Drift una sola volta, non una per Task.
- Rimozione ottimistica: al clic le schede che Clear cancella spariscono subito dalla Board e restano nascoste finché la cancellazione non finisce. Se Clear è rifiutato o fallisce, le schede non cancellate tornano, con l'avviso in cima alla Board.

## Assunzioni da verificare

- Le schede col badge `kept` non spariscono mai, nemmeno per un istante, perché Clear non le cancella.
- L'host dice alla Board quando la cancellazione è finita con un messaggio apposito, così un quadro arrivato prima della fine non fa ricomparire le schede.
