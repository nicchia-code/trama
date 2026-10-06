---
status: approved
base:
  work/task.md: f56742e99c922f5f17529433a082ac208f6567520873bc808bff9156599848f5
  editor-panel/panel.md: 058c826ef2a721cc88487dc9a696ebbff3c1f36e01bee1942e2380b76d433aaf
  requirements/rules/general.md: 80d5e54229070a30c2a6a4218bc45749f3734c5f77cdc1667efdb8a1b9cddafc
  requirements/data/work.md: d6e55f815530d5dbeb08e543cc2033b2d5c57e62ce40670434f4817f6d56f49f
  requirements/ui/panel.md: 0cbd2a5074b5f9d4468d002b0eefaca9923631b6e147652f14300f7981f912a9
  work/feature.md: 95430d5b95427536d6a7cfae6e5e9c0a5024df30f0b2657e0d52d9a50dddbc7e
delete: []
created: 2026-10-06T12:13:22.703Z
scanScope:
  - ref: work
    reason: changed
  - ref: panel/Board
    reason: changed
  - ref: task
    reason: changed
  - ref: task/Done
    reason: changed
  - ref: panel/Open/developer.SHOW_BOARD
    reason: leads into a change
  - ref: task/To do/developer.MOVE_TASK_TO_DONE
    reason: leads into a change
  - ref: task/To do/agent.MOVE_TASK_TO_DONE
    reason: leads into a change
  - ref: task/In progress/agent.MOVE_TASK_TO_DONE
    reason: leads into a change
  - ref: task/Free/developer.MOVE_TASK_TO_DONE
    reason: leads into a change
  - ref: requirements/data#task
    reason: changed
  - ref: requirements/rules#General
    reason: changed
  - ref: requirements/ui#General
    reason: changed
  - ref: requirements/ui#panel/Board
    reason: changed
---
# Numero breve per design e colonna Done per data

Perché: oggi un Task di un design perde il numero breve appena va in Done, mentre il design è ancora in corso, e la colonna Done elenca i Task dal più vecchio, senza modo di trovare quelli finiti di recente.

Decisioni:
- Un Task che fa parte di un design tiene il numero breve finché tutti i Task del design sono in Done; poi lo liberano insieme. Vale anche per un design di un solo Task (si comporta come oggi). Un Task fuori da ogni design lo libera in Done come oggi.
- Se un design finito si riapre (Task nuovo legato dallo scan di fine corsa, o Task riportato indietro), i Task già Done restano senza numero; lo prendono solo i Task in To do o In progress.
- Il Task ricorda l'istante in cui è arrivato in Done; l'istante si cancella quando lascia Done e si riscrive al ritorno.
- La colonna Done della Board del pannello mostra le schede dalla più recente, raggruppate per giorno nell'ora locale del developer, con intestazioni «Oggi», «Ieri» o la data, più il conteggio.
- Una scheda di design in Done sta alla data del suo ultimo Task finito.
- Filtro a intervalli predefiniti: Oggi, Ultimi 7 giorni (predefinito), Ultimi 30 giorni, Tutto; ricordato solo nella sessione del pannello.
- I Task Done senza istante (finiti prima di questa modifica) stanno in un gruppo «Senza data» in fondo, visibile solo con Tutto.
- Il numero della colonna Done conta le schede che il filtro lascia vedere.
- La riga di comando (`trama board`, `trama task list`) non cambia.

Assunzioni da verificare:
- Il nuovo campo del Task si chiama `finished` (istante UTC ISO 8601).
- I testi della Board restano in inglese come gli altri: `Today`, `Yesterday`, `Last 7 days`, `Last 30 days`, `All`, `No date`, `Nothing done in this period`, etichetta accessibile «Done period»; la data dei gruppi è scritta nella lingua dell'editor.
- A parità di istante di fine decide l'ordine di creazione inverso.
