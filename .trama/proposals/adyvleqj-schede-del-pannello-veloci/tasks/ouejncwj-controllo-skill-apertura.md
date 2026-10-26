---
technical: false
refs:
  - project/Trama project/developer.OPEN_PANEL
  - requirements/rules#project
---
# Controllo skill solo all'apertura

Il controllo delle skill all'apertura di Trama non deve più partire quando il pannello è già aperto e il developer cambia solo vista dal menu laterale o con un comando Show …. Oggi parte a ogni clic e lavora in modo sincrono nell'extension host: legge i Requisiti e le skill e, con Solo mode, lancia `git`.

Quando il Task è finito:

- Il controllo parte da ogni chiamata di Open Trama (il comando della palette e il Reopen dell'avviso delle domande), anche con il pannello già aperto che torna solo in primo piano, come oggi.
- Una voce del menu laterale, e i comandi Show Board, Show Diagram, Show Requirements, Show Specs, Show History, Show Team e Show Settings, avviano il controllo solo quando il pannello era chiuso e lo aprono. Se trovano il pannello aperto lo portano in primo piano o lo spostano sulla vista: la vista cambia subito e nessun controllo parte.
- Il controllo resta in sottofondo come oggi: il pannello si apre senza aspettarlo. Non parte quando il pannello si apre da solo per un round di domande, in una finestra senza cartelle né su Get Started. Un controllo in corso non ne avvia un secondo, e uno fallito si riprova alla prossima apertura che lo avvia.
- La riparazione del blocco di Solo mode, che sta nello stesso controllo, segue le stesse aperture.
- Il codice è `Controller.show` in `extension/src/host/controller.ts`: chiama `checkSkillsInBackground` solo nel ramo che chiama `create`, mentre nel ramo `revealPanel` manda soltanto `navigate`. `Controller.open` resta com'è.
- I test dell'host coprono tre casi: una voce del menu a pannello chiuso, che controlla; una voce del menu a pannello aperto, che non controlla; Open Trama a pannello aperto, che controlla.
- `CHANGELOG.md` registra il cambiamento e `docs/uat.md` aggiorna i passi che si aspettano il controllo a ogni voce del menu.
