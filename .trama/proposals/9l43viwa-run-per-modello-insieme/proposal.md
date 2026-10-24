---
status: approved
requires:
  - ppwmswz5
base:
  work/task.md: a1b2bd5d8975edb8238afda035e93fbbea04fd03f18e8791144c9fa7c55fc123
  agent-launching/drift-resolution.md: 0f959219bbfd5c932424793a9321a06a84c525e2f58ae8a56d0ca82260cbef59
  requirements/rules/models.md: 5988f0500b86bfc2bfd539c75490309030f598a58553be5c58d9acdbcb494a5c
  requirements/tech/models.md: b57ed67bca70832870e09c708d62fa809a143186eefc8e5a1806c9eba21b3a4e
  requirements/rules/run-paralleli.md: new
delete: []
created: 2026-10-24T08:05:17.854Z
label: Run in parallelo
---
# Run per modello insieme

Quando i Task eseguibili appartengono a Proposal con modelli diversi, Run all diventa una sequenza di Run, uno per modello, che partono uno dopo l'altro: ogni Run paga da solo il suo avvio, la sua chiusura e le sue catene di Task, e con più design in esecuzione insieme è la serializzazione più grande di una corsa. Con Parallel Execution i Run di una sequenza partono insieme; le prenotazioni dei file li tengono separati sul codice e un solo limite di sotto-agenti vale per tutti.

## Decisioni

- Il limite dei sotto-agenti N vale per tutta la sequenza: ogni Run riceve una parte di N proporzionale ai suoi Task eseguibili, almeno 1, e la somma delle parti non supera N.
- I Run per modello partono insieme solo con Parallel Execution accesa; spenta, la sequenza resta uno alla volta come oggi.

## Assunzioni da verificare

- Le parti si calcolano al lancio, una volta sola, come i gruppi della sequenza, e non cambiano quando un Run finisce.
- Con più gruppi di modello che posti (più modelli di N), partono i primi N gruppi nell'ordine di oggi, con un posto ciascuno, e gli altri partono uno alla volta quando un Run finisce normalmente, come la sequenza di oggi.
- Un Run che finisce in modo anomalo non ferma gli altri già partiti; ferma solo i gruppi che non sono ancora partiti, come oggi.
- La sequenza resta un solo Run lanciato da Trama finché l'ultimo dei suoi Run non è finito.
