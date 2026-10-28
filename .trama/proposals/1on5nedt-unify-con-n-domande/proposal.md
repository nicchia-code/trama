---
status: approved
base:
  work/drift.md: 99b23387253f38fa08f73a4223e5e58f145badf8b586cd62daf421fff0223f79
  agent-launching/drift-resolution.md: 2b9c25bc3d6f75e52e6f34f635d346060ad6e3335c75725e1ad45f143e1f42bd
  model-changes/proposal.md: 0d6d9aeb751a4c926d435199516d6c8758e509c99f79f1f320b63900ec80605b
  work/task.md: 27637c1c354926aaa1d1bb65d5b28780eb07741dc5de53220d04a9ad016230b8
  editor-panel/panel.md: 0b83f4f3fdea171066cb67c7f4ca8bfa0775bb5c25d68252bf8aefab282daeec
  agent-questions/question-round.md: e3b40df64c31c22843a720d5564820f952e6d2a04dc8f4b5aef597ef8b8a955d
  requirements/data/unify-drifts.md: aec10c04429bf660a31b8ca6693c75dce643f8884b8a931e1f7ce25c4fcf52e7
  requirements/rules/unify-drifts.md: a68536cb3d0548e22bccbbbab17c72e5e0a104c3458e1019eb04a801e6cb2926
  requirements/tech/unify-drifts.md: 3a0d2389cebf9c573fd50e8b5c9543efc72f23b54cbda0a3e2de4e571ecc740b
  requirements/cli/unify-drifts.md: f0cc270bdb1675cf8cefd5e97eb5972cb2a98deb997e5c86d65676f46fe4141e
  requirements/ui/unify-drifts.md: 6a7f141bbcb85d160dd558ba232ca0a662b7e31ddcc9b0798901f72823e2d8b2
delete: []
request: 2026-10-27T08-36-07
created: 2026-10-27T07:51:19.602Z
label: Unify Drifts
---
# Unify con N domande

Unify Drifts resta un'utilità che raccoglie i Drift aperti in un solo Drift unificato, ma il Drift unificato non fonde più le decisioni: tiene una differenza per ogni Drift unito, e risolverlo fa una domanda per ogni differenza aperta, con un esito per ciascuna.

## Decisioni

- Unify Drifts resta un lavoro dell'agente, una differenza per ogni Drift unito; all'unificazione l'agente non chiede nulla.
- Con l'Async Drift Resolver acceso l'agente parte dalle domande pronte che i Drift hanno già, fa un controllo veloce delle interdipendenze e adatta solo ciò che le differenze collegate richiedono, poi scrive il round pronto.
- All'approvazione ogni differenza da correggere ha il suo Task di correzione; le differenze interdipendenti (collegate) corrette nella stessa risoluzione condividono un solo Task, per evitare dipendenze fra Task.
- Le differenze collegate le segna l'agente di Unify Drifts durante il controllo delle interdipendenze.
- Le domande saltate lasciano aperte solo le loro differenze; il Drift unificato resta aperto con quelle e il prossimo Resolve chiede solo quelle.
- Con l'Async Drift Resolver la domanda pronta di un Drift unificato è un round di N domande, aperto subito da Resolve.
- Se le risposte danno esiti diversi a differenze collegate, Trama lancia l'agente di risoluzione con tutte le risposte, che le concilia e, se serve, rifà solo quelle domande adattate (qualità prima della fretta).
- Ogni differenza tiene la Proposal allegata del suo Drift invece di scartarla; Trama copia nella risoluzione quelle delle differenze in cui si tiene il codice.
- Se solo alcune domande pronte sono scadute, Resolve lancia l'agente, che tiene le valide, riscrive solo le altre e fa un round di tutte le differenze aperte.
- Nel pannello un blocco richiudibile per differenza, le decise chiuse con il loro esito; la scheda rossa dice quante differenze restano aperte (`3 of 8 open`).
- I Drift unificati scritti prima, D1 compreso, valgono come una sola differenza: una sola domanda, come oggi, senza migrazione.

## Assunzioni da verificare

- Una differenza decisa conta come Drift risolto con il suo esito sui propri elementi: per non riarchiviare una differenza chiusa e come precedente di un Drift ricorrente, citata con l'identità del Drift da cui viene.
- Un Drift unificato con differenze blocca i Task solo con gli elementi e le origini delle differenze ancora aperte; le origini di una differenza corretta aspettano solo il suo Task.
- Dalla riga di comando un Drift unificato con differenze si può solo chiudere intero senza cambiare nulla; correggere il codice o accettare una Proposal è rifiutato e rimanda a Resolve. Dismiss Drift dal pannello chiude tutte le differenze aperte e scarta le loro Proposal.
- Un Drift unificato con differenze può essere unito di nuovo solo finché nessuna differenza è decisa: le sue differenze diventano differenze del nuovo.
- Quando l'ultima differenza aperta è decisa, il Drift unificato passa nel nuovo stato finale Differences decided.
