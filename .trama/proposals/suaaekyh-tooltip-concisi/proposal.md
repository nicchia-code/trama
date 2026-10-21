---
status: approved
base:
  agent-questions/question-round.md: 0ff98b2c56f41b38ab55f55360f4ed766c169884edb9d91faffd5daf47c92106
  actors/agent.md: 1d5da380a846c573d2a3ac8899e6a57cfad3374a538d2b94aa881dd31a264758
  requirements/ui/panel.md: 28ee8c93ef17977956be0dbb9d77f78de4eaa8eb9c160ea897f4a995ae29b73a
  requirements/ui/settings-specs.md: d8f22718d44d0ad8a4c9082449582362d5384c4d970fbdf0144e816e0adfd526
  requirements/ui/agents.md: 9c512e4398aaf06871a6f12075d92b126681269300de98826dbfc062a36f63c4
  requirements/ui/work.md: b9464985abda0ab55575db240446a0a6ab63a8f1785e3f844c76d4011e7bf9d2
  requirements/ui/diagram.md: 1b6c02aed6e5ddad69d6af4fd69ba57611eaa84a97db875589bd511d5d7f1f2b
  requirements/tech/questions-notices.md: 3616754462da3782685a8a74c4422ff68ad4ac3c1894aebb773c346c6d37c601
  requirements/rules/questions-notices.md: 4815da016dbc07a5ddd00bb3ffd584e68b842e390d20a4daad0487fa7d5aa06b
  requirements/rules/agent-terminal.md: cc1293d2721c1ed2c5fec49eb8af71a25acc7e866d15ac63869358d1fb35bd56
delete: []
request: 2026-10-21T15-51-42
created: 2026-10-21T14:29:05.782Z
label: Tooltip concisi
---
# Tooltip concisi

Molti tooltip del pannello sono interi paragrafi, le tendine dei modelli tagliano i nomi, e un developer lento perde tutte le risposte di un round di domande perché l'agente smette di aspettare dopo la scadenza predefinita del suo strumento (300 s con omp).

Decisioni dell'intervista:
- Tutti i tooltip del pannello seguono una regola generale in `ui#General`: al massimo due frasi, circa 160 caratteri.
- Le spiegazioni delle impostazioni (`markdownDescription`, fumetto della «i» e pagina delle impostazioni dell'editor) sono riscritte in 1–2 frasi ovunque; il dettaglio resta nei Requisiti e nella documentazione.
- Il riquadro al passaggio sopra un nodo o un arco del Diagramma mostra il titolo e la prima frase della descrizione (o della prosa della Transizione), senza elenchi; la frase si mostra intera anche se supera il limite.
- I tooltip della Board che elencano elementi (badge `stale`, `invalid`, `unfixable`, `unregistered files`, Approve bloccato da Proposal richieste) seguono la regola per la frase introduttiva e tengono il loro elenco breve.
- I tooltip che mostrano per intero un testo accorciato con i puntini (per esempio l'indice delle domande) restano, esclusi dalla regola.
- Nei campi dei modelli (Settings, wizard, finestra del modello sulla Board) si allarga solo la tendina, fino alla voce più lunga dell'elenco intero, stabile mentre si filtra; il campo resta nella griglia.
- Se la voce più lunga non entra, la tendina è larga quanto il pannello e le voci vanno a capo: mai puntini.
- Nessuna scadenza per le domande: le skill e l'istruzione di lancio dicono all'agente di chiamare `trama question new` senza limite di tempo (con omp `timeout: 0`).
- Se l'agente smette comunque di aspettare, il round finisce come oggi (Abandoned, nessun avviso, risposte perse).
