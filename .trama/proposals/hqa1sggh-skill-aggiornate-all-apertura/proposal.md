---
status: approved
base:
  project-setup/project.md: 3f1557b0e417a41d39851b948ab4ae1bf816e8e1b1f4bd826ce6480c9918d47b
  requirements/rules/project.md: 739f606eb0ba5c2b88f80ccfa4db2301e2c5f30c155e6c7dea5c3faced037574
  requirements/rules/models.md: 12d0878e97154cd66da58c3f6acf4fe19afff7f791eb53f1ac7532fdfab86451
  requirements/tech/models.md: 8f2cbd626acae1a4eb4341e962419989ef2391c6627cc5265aa21eee6a162f7c
  requirements/tech/project-panel.md: 5e80c594729a59e5e915d4b11d47377c4505b2a6c2543a5f70e7421ccc4db095
  requirements/ui/get-started.md: de3622c8d3a4023bd03262fcbb253f5c0f5093ac71ac836684343c016ee54f55
delete: []
request: 2026-10-21T05-58-25
created: 2026-10-21T04:06:21.010Z
label: auto-update skill
---
# Skill aggiornate all'apertura

Aprire Trama dall'editor controlla in sottofondo se le skill installate per l'agente sono indietro rispetto a questa versione. Se lo sono, le aggiorna senza che il developer debba ricordarsi di lanciare Update skills, e lo dice solo quando ha cambiato qualcosa.

Decisioni dell'intervista:
- Il controllo parte a ogni apertura ordinaria di Trama: il pulsante Trama in basso a sinistra, l'icona Open Trama, il comando Open Trama e il Reopen dell'avviso delle domande. Parte anche quando il pannello è già aperto.
- L'apertura automatica del pannello per un round di domande non controlla nulla.
- Il controllo riguarda ciò che Trama installa per l'agente:
  - le skill dell'agente e le skill ritirate;
  - la definizione del sotto-agente di omp e le istruzioni dell'advisor;
  - le skill di Requisiti;
  - la definizione utente del sotto-agente della chat, quando il suo contenuto cambia, così un cambio di `trama.scan` arriva alla chat alla prossima apertura.
- Due cose restano solo nel comando: portare le Aree al formato a frammenti e creare le Aree di partenza.
- Le copie modificate a mano si sovrascrivono senza chiedere, come fa Update skills.
- Il pannello si apre subito, senza aspettare il controllo.
- Quando qualcosa è stato aggiornato compare un avviso breve: `Trama: updated the agent skills to this version.`. Se non è cambiato nulla, non compare niente.
- Se il controllo fallisce compare un avviso di errore con il motivo: `Trama: could not update the agent skills: <reason>.`
- Il comando Update skills resta com'è, con il suo resoconto completo.
