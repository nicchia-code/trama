---
status: approved
base:
  actors/time.md: c12a0442adbba86a9a075a8180a120f74026e6f0c7ce9f246f642e80e07061a8
  actors/ntfy.md: new
  away-notifications/feature.md: new
  away-notifications/notice.md: new
  agent-launching/agent-terminal.md: 1d69eef85fda776f1bd915e8e2143c448306473bbf0a6a2cc50cef2f0985f753
  agent-questions/question-round.md: b80f88bff537d13f95782556d9798f7fcd911a3b92b49bef5d5c1fb0367b9f10
  requirements/tech.md: 51d5df120d65d076db6c7defcfdc203765e9514be6a835a29fa66fafabf07517
  requirements/rules.md: b1551d3fea2e14b790655a8c65f40f8dba819b3e2b3fddf8c9961f16dee97078
  requirements/data.md: 97e98f5ee4b6020afe59acff70bdfbf5995a8f56fd86c6b4864cfd40ce79dc8c
  requirements/ui.md: 2297dc83c3c8823352a9b6c5fb58b03c3740f406732fa8a2ed9bd0f06a216c91
  requirements/quality.md: f104c79928b244ea4663a14301f6c2a4a4666f26ab4287764e574b6fd5c0c151
delete: []
created: 1970-01-01T00:00:00.027Z
---
# Notify the developer through ntfy when the agent stops

Il developer che si allontana dal computer vuole sapere quando l'agente si ferma. Se nelle impostazioni utente è indicato un argomento ntfy, Trama invia una notifica quando un round di domande dell'agente avviato in un terminale resta senza risposta per 10 secondi e quando il comando dell'agente termina (a meno che entro 10 secondi parta un'altra istruzione nel terminale). Funziona solo con il launcher del terminale: nessuna copertura parziale per la chat. Senza argomento non cambia nulla, come per la lingua.

Scelte confermate dal developer: un'unica impostazione (nome argomento oppure URL completo), solo impostazioni utente, nessuna autenticazione; avviso su domanda e su fine del comando, solo per agenti avviati da Trama in un terminale (niente chat); la fine è annullata solo se parte un'altra istruzione; una sola notifica per round di domande; testo della domanda con le opzioni, fine con riepilogo della Board; un retry dopo 10 secondi e poi avviso nell'editor.

Scelte mie da verificare: priorità e tag (domanda 4/question, fine ok 3, fine con errore 4/warning), troncamento a 4000 byte, timeout della richiesta 10 s, un solo avviso nell'editor finché un invio non riesce, valore invalido senza richieste di rete, testi in inglese anche con una lingua scelta, nessun avviso quando il developer chiude il terminale.
