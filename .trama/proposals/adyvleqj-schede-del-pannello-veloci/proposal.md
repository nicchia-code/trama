---
status: approved
base:
  project-setup/project.md: 67db5492a2b0cf8aef23392b8998c6d0443803b43b6beffaefe6fe90418b5780
  editor-panel/menu-laterale.md: 8549a59b1d8392896a2ef990b652f81daf0c508ce1cbed8aaeb4cc4842353f7e
  requirements/rules/project.md: 4055f05fa3efe265ea0aeea52824e99c7639a83d2c9d4a62674930c65810dbd9
  requirements/tech/menu-laterale.md: bbddc2b6c228b3c6c67b96b6b9068e5d881c186ef36dcdf4e736a6b3a9facae5
  requirements/tech/panel.md: ebcfa56722e8c8028bf1cd73d6a46a27223c201828cfc6f7fe2327f38c8cd2d2
  requirements/quality/panel.md: new
  requirements/tech/picture.md: new
delete: []
created: 2026-10-26T12:06:18.884Z
label: Schede veloci
---
# Schede del pannello veloci

Su un computer con antivirus/EDR cambiare vista nel pannello è lento, perché ogni cambio lavora in modo sincrono nell'extension host:

- il menu laterale ricostruisce tutto il suo stato solo per spostare l'evidenza: un quadro completo di `.trama/` e fino a ~8 comandi `git` con Solo mode;
- ogni voce del menu e ogni comando Show … avvia anche il controllo delle skill.

Il quadro di `.trama/` è lento già su un Mac pulito: ~450 ms su un progetto con 403 Drift e 358 Proposal. Circa il 60% del tempo è una rilettura quadratica dei Drift unificati; il resto sono riletture ripetute e la rianalisi di tutti i file a ogni quadro. Ogni cambiamento costruisce due quadri, uno per il pannello e uno per il menu.

Decisioni del developer:

- Perimetro: il cambio di scheda e un quadro più leggero. Restano fuori l'esecuzione asincrona dei `git` del menu, il watcher su tutta la copia di lavoro e il debounce degli altri gestori (vedi la nota in fondo).
- Controllo delle skill: parte quando il pannello si apre davvero e con Open Trama. Non parte quando una voce del menu o un comando Show … cambia la vista di un pannello già aperto.
- Menu che torna visibile: mostra l'ultimo stato, che i watcher tengono aggiornato, senza rileggere nulla.
- Quadro: ogni file è letto e analizzato al massimo una volta per quadro. Una cache in memoria tiene i file già analizzati finché data di modifica, dimensione e identità del file non cambiano, così un quadro rilegge solo i file cambiati.
- Un solo quadro per cambiamento, condiviso da pannello e menu.
- Requisiti di prestazione scritti come regole strutturali verificabili con test, senza soglie in millisecondi.

Nota per il futuro, chiesta dal developer: una Proposal successiva può rendere asincroni i comandi `git` del menu (stato del Merge di Solo mode e lettura di `origin`). Può anche restringere il watcher che segue ogni file della copia di lavoro per il Merge di Solo mode, e mettere un debounce all'elemento delle attività e all'execution check, che oggi rileggono `.trama/` a ogni evento. Questa Proposal non li cambia.
