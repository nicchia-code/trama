---
column: done
technical: true
refs:
  - requirements/tech#General
  - requirements/rules#announcement
drift: null
proposal: null
agent: false
created: 2026-10-07T05:30:56.411Z
finished: 2026-10-07T05:57:32.068Z
---
# Togliere trama.autoImplement da documentazione, script di accettazione e skill trama-implement

Nessun testo del progetto descrive più la scansione automatica che prosegue realizzando i Task.

Quando è fatto:
- README e `docs/` non nominano più `trama.autoImplement` e dicono che la scansione automatica (e quella in sospeso di Hold scan) si ferma dopo aver archiviato i Task, che il developer avvia dalla Board (per esempio con Run this design); continuano a descrivere `trama task next --batch` e `## Scan scope`.
- Lo script di accettazione si aspetta l'istruzione della scansione automatica senza la parte su trama-implement, e il passo che spegne `trama.autoImplement` sparisce.
- La skill `trama-implement` non presenta più il titolo `Final check of <Proposal title>` come usato anche dopo la scansione seguita all'approvazione: quel titolo vale per la corsa di un design, come dice `rules#announcement`.
