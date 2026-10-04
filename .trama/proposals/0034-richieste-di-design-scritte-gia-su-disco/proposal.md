---
status: approved
base:
  agent-launching/design-request.md: c01ae31e8da9e45ab6946e89da7d97d1a49013022a370340d19457cd50f81235
  agent-launching/feature.md: 719093aa75ba13b64b0ff5f5a81c11d407a8dff0718e539279baf3fb32e1a67f
  actors/developer.md: 8eba526aa85eb19fe0884377ac3baddc3717481967f21c3000f141e6980d4b1d
  actors/workspace.md: 8481430927e892330483d5b475a0bcfa910ea381a3e4d648b3d41f806c02ffd1
  requirements/data.md: ccdd7012f2b60de8f1d2868f08227a1893f2803f23d177558fa189410b68bee3
  requirements/rules.md: 72d2cb27486c22caeafae23e500ac3410905b2e93ecc4320ec5ef1dcac92edb8
  requirements/tech.md: 794c834ec77f4dd2d770f57a78152436aa27f9004fa83058489cabae32d1f17e
  requirements/ui.md: 8e813f5a51b58d6ce3ad386895f07fbfe8a8d674a5522489a5ebfca5948cb14b
delete: []
---
# Richieste di design scritte già su disco, inviate chiudendo la scheda

Oggi Design… apre un documento senza titolo: salvarlo chiede una posizione e il file nasce solo all'invio, una frizione inutile. Decisioni dell'intervista:
- Il file della richiesta nasce vuoto in `.trama/requests/` già con Design….
- Trama salva la richiesta da sé poco dopo ogni modifica, così chiudere la scheda non mostra mai il dialogo di salvataggio.
- Chiudere la scheda di una richiesta mai inviata la invia se ha testo; se è vuota il file è cancellato e non parte nulla.
- Il pulsante Send to agent resta: salva, chiude la scheda e invia, come chiuderla.
- Una richiesta inviata non si invia più: riaperta resta modificabile, senza pulsante, e chiuderla non invia né cancella, nemmeno se vuota. Per ripartire serve una nuova richiesta.
- Trama ricorda quali richieste sono state inviate nello stato dell'editor per il progetto, così vale anche dopo un riavvio.
- Chiudere la finestra dell'editor non invia nulla: la richiesta resta su disco e la sua scheda, riaperta e chiusa, la invia.
- Le richieste si ritrovano dall'esploratore dei file; nessun accesso nuovo nel pannello.
- Una richiesta inviata e mai consumata resta finché il developer non la cancella.
- Il nome del file è data e ora locali con i secondi, come `2026-10-04T19-05-12.md`; quel nome senza `.md` è l'ID passato a `--request`.

Assunzioni da verificare:
- Il salvataggio automatico avviene al più 300 ms dopo l'ultima modifica, così una chiusura rapida non fa comparire il dialogo di salvataggio; se compare e il developer rifiuta, parte l'ultima versione su disco.
- Due richieste create nello stesso secondo prendono il suffisso `-2`, `-3`, … nel nome.
- Send to agent su un testo vuoto continua ad avvisare senza chiudere la scheda; chiudere una richiesta vuota la cancella senza messaggi.
- Se l'invio non parte (per esempio il developer annulla la richiesta del comando dell'agente), la richiesta resta su disco come mai inviata.
- Il tooltip di Send to agent diventa «Send to agent (closing the tab sends it too)», perché nulla altrimenti dice che chiudere invia.
- La chiusura di una scheda conta solo quando nessun'altra scheda mostra lo stesso file.
