---
column: done
technical: false
refs:
  - design-request/Writing
  - design-request/Writing/developer.ASK_AGENT
  - design-request/Writing/developer.CLOSE_REQUEST
  - design-request/Sent/developer.ASK_AGENT
  - design-request/Abandoned
  - requirements/rules#agent-terminal
  - requirements/rules#announcement
  - requirements/rules#design-request
  - requirements/tech#design-request
  - requirements/ui#design-request
drift: null
proposal: "0031"
agent: false
---
# Write a design request in an editor tab and send it to the agent with Send to agent

Design… apre un documento Markdown senza titolo e completamente vuoto in una scheda non in anteprima; l'estensione ricorda in memoria che quella scheda è una richiesta (dopo un riavvio non lo è più). Sulle schede delle richieste, e solo su quelle (documento aperto da Design… o file in `.trama/requests/`), la barra del titolo dell'editor mostra il pulsante «Send to agent» con l'icona `send`.

- Da Writing con testo non vuoto: il testo è salvato come nuovo file di richiesta, il file salvato si apre nella stessa colonna e il documento senza titolo si chiude senza chiedere di salvarlo; parte l'istruzione «Use the trama-design skill on the design request in `.trama/requests/<id>.md`. Bind the first Proposal you open to it with `--request <id>`.» con il launcher scelto (frase della lingua e riga del PATH di Cursor come per ogni istruzione).
- Con il launcher del terminale l'annuncio della Proposal prende il titolo della richiesta.
- Testo vuoto: nulla è salvato né inviato, e compare l'avviso «Trama: write the design request before sending it.».
- Da Sent: le modifiche non salvate sono salvate, poi parte la stessa istruzione con lo stesso file; ogni invio dal terminale fa un nuovo annuncio.
- Chiudere il documento mai inviato non salva e non invia nulla.
- Dopo l'invio nessun messaggio di conferma oltre a quelli del launcher.
