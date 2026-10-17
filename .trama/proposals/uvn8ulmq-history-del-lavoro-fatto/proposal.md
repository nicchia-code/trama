---
status: approved
requires:
  - dk0grfyg
  - iwham416
base:
  work/announcement.md: 4650e1ca9119f2c444ae82425b56463728738a2a8f301968a2eec59ac0dd3beb
  work/task.md: 9fca6a3ac30c9ecd461d2b5bff8b8a54d228d6372b643db942c069155744ee6d
  editor-panel/panel.md: d54c6575475854d1c8a70c50d8e491b568c546ae58b3bb0cacb256af5e0fcd6d
  work/feature.md: 051cd041039c620fd9f7263c8828385e22778e3ac1e1a70b5eb9245796734daf
  actors/agent.md: 483957978b921209f41a36937b0796a06f9369f9fcdd6b1fe97b4a34a586ec92
  work/voce-history.md: new
  requirements/ui/board.md: 805bb5ff6e575f59ddf4f55d2e7f80d74ded1b251bc48330524962004a5d0998
  requirements/ui/tasks.md: c9d3e22eda225c2b7fdae012cce8f068ef8ae6c517134b4bfa73727da756ae90
  requirements/ui/ghosts.md: 459a24ec7fdc5ede21bc0dac83baaf87ae2c5b2c2db8147f3916ea33183c8e9d
  requirements/ui/panel.md: 3b097b9fa540287764849c66d36961568dabd9b1c87dd9be6af39d8e734ca53e
  requirements/rules/announcements.md: 3a9bddfab45082518571c638cf6cb0c501d6516e8b806832b2ce1a5b0cbae8a0
  requirements/data/work.md: 60dad41140af0c34ac3872dacc774edd9b8dc494bf83532ee492f59bb21d2d86
  requirements/data/proposals.md: 1f37ea4fd93abe5e512e23610e51c07752ca238d96d1433c12742b8e61e7bf27
  requirements/tech/announcements.md: 1f796c5c5d26d6ff8bae08f4f3af7bd07a74f0249f65b768f6ae056519c7d0f7
  requirements/tech/project-panel.md: a646582ef1d2b6b82d0f6ca3f7865542cca22d323cbc9bb97f19567b20c2f51e
  requirements/tech/work.md: d356bf8c9f0301e6f514fd184473225b898cf048ca26e3eaabf4a2ca251bb4e1
delete: []
created: 2026-10-17T09:57:07.577Z
---
# History del lavoro fatto

La richiesta «Rework UI/UX - Board» vuole che l'ultima colonna non elenchi più i Task fatti, ma racconti le macro-funzionalità realizzate, con la data: una rielaborazione semantica scritta dall'agente, non una Proposal che diventa Done. Si appoggia alle Proposal `dk0grfyg` e `iwham416`.

## Decisioni

- La colonna Done diventa History, collassata all'apertura del pannello; i Task finiti non stanno più in nessuna colonna.
- Una voce di History ha titolo, data e un riassunto breve; una «i» apre una finestra con il testo completo e i Task che racconta, con titolo, data di fine e riferimenti cliccabili.
- Le voci le scrive l'agente alla fine di ogni corsa che ha realizzato almeno un Task, anche se la verifica fallisce e anche nel Run automatico delle correzioni.
- L'agente raggruppa per macro-funzionalità e, quando una funzionalità ha già una voce, la aggiorna invece di scriverne un'altra.
- History parte vuota: il lavoro finito prima non ha voci.
- Una voce è un file versionato in `.trama/history/`.
- La data di una voce è l'ultima volta che è stata scritta o aggiornata.
- Restano il raggruppamento per giorno e il filtro del periodo, applicati alle voci.
- L'agente scrive le voci con i comandi `trama history`, che le validano.
- Il ghost del controllo di fine corsa mostra la fase `Updating History` mentre l'agente scrive le voci.

## Scelte fatte da me, da controllare

- Il riassunto ha al massimo 280 caratteri su una riga; il testo completo può essere vuoto; una voce cita solo Task Done realizzati (mai chiusi senza modifiche); un aggiornamento aggiunge Task e non ne toglie; un Task può stare in più voci.
- I comandi sono `trama history add`, `update`, `list` e `show`; la fase si cambia con `trama announce phase <id> history`.
- Nella scheda la data è l'ora per `Today` e `Yesterday`, giorno e ora per esteso negli altri gruppi; la finestra dei dettagli si chiude con `Close`, Esc o un clic fuori e restituisce il focus alla «i»; il menu del periodo si chiama «History period» e la colonna vuota dice `Nothing done in this period`.
- Le regole e la tecnologia di History stanno in frammenti esistenti (`rules/announcements.md`, `tech/announcements.md`, `data/work.md`, `ui/tasks.md`) invece che in frammenti nuovi, così le skill dei Requisiti restano un frammento per skill e non passano alla modalità indice.
