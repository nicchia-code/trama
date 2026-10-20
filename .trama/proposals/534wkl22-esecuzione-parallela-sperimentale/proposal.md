---
status: approved
base:
  work/task.md: 4fea8595c1638d75db173cd76165085d733cb557c5c413f7b6182bc55930d8a6
  editor-panel/panel.md: 0a4edffb6e3963914ab994b5fcb7889e74f1de3bb58fb8b349e828894ab9777c
  requirements/rules/models.md: 5622041e688a5b066f4ce2b3d34b98184a2b4701227c19cbe2fea52b3a43d4c7
  requirements/ui/settings-specs.md: a91d5c4c1ad1d154fac9849396a9350cfe99cc9bc9246c47dc008c3c29867ce9
  requirements/tech/settings.md: 93174ebf0bc733c1ea35999f20713bea8f6e1ad9933e1d15877427c88eb8f08b
  requirements/tech/work.md: b68c5c1e00b586e40296939656fad294b589fbcb17a321dac1c60976b05572e2
  requirements/tech/scans.md: 90716c2b3c928d7273b641cc858aa643188b1a6fc849275c7364747c849aab1f
  requirements/cli/main.md: aac914404263ee19727bc870b6967d94bdf9f44cf7ce3a9adb969b43369581d6
delete: []
created: 2026-10-20T20:40:03.646Z
label: Parallel Execution
---
# Esecuzione parallela sperimentale

Nei log dei Run le attese non vengono dalla cartella condivisa ma dalla regola fissa di `task list` con `runnable`, che non dà mai insieme due Task che riguardano la stessa cosa, e dalle dipendenze scritte solo nel testo dei Task: nel Run della CLI la catena dei Task ha occupato quasi tutti i 49 minuti con 1,2 Task in media al lavoro. Un esperimento lascia all'agente il giudizio su quali Task far partire insieme e in che ordine, sopra la regola di Trama.

Decisioni del developer:
- Il giudizio può sbloccare (far partire insieme Task che la regola separa) e ordinare (trattenere un Task finché un altro è Done), sempre con un motivo; non tocca i blocchi dei Drift né il limite dei sotto-agenti.
- L'agente fa un piano all'inizio della corsa e lo rivede quando un Task finisce, nasce o si blocca.
- Il piano si basa su testo, riferimenti e Proposal dei Task, senza leggere il codice.
- Un sotto-agente che si scontra con un altro Task si ferma e lo dice all'agente principale; il suo Task resta In progress e viene riaffidato dopo, con il resoconto di cosa era già stato fatto.
- `trama task list` con `runnable` mostra i Task trattenuti dalla regola e con chi si sovrappongono.
- Ogni scelta (via libera, ordine, conflitto) è una riga nelle timing e una voce del resoconto della corsa.
- Vale per tutte le corse su più Task: Run all, sequenze per modello e Run automatico.
- Si accende con una casella utente `Experimental Parallel Execution` nel gruppo Experimental, spenta di default.

Scelte mie da verificare:
- Le scelte si registrano con un nuovo comando `trama timing new` con `{ kind, tasks, reason }`; `timing list` le mostra in una sezione `Parallel choices`.
- Il campo `heldBack: true` di `task list` mostra i Task trattenuti: la riga di comando non legge l'impostazione, che arriva all'agente solo con la frase dell'istruzione.
- Le regole stanno in `rules#agent-launching` (`rules/models.md`), perché `rules/tasks.md` e `rules/agent-terminal.md` sono già al limite dei 12 KB e un fragment nuovo farebbe passare le skill dei Requisiti alla modalità indice.
- Il testo della descrizione in Settings, in inglese, è mio.
