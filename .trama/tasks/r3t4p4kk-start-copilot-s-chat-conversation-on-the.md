---
column: done
technical: false
refs:
  - agent-terminal
  - requirements/rules#agent-launching
  - requirements/tech#agent-launching
  - requirements/tech#agent-terminal
  - requirements/ui#agent-launching
drift: null
proposal: dtpkqiid
agent: false
created: 2026-10-11T08:38:05.075Z
finished: 2026-10-11T08:42:36.058Z
---
# Start Copilot's chat conversation on the model of the run's role and warn when it is not found

Quando un'istruzione va alla chat di Copilot e il ruolo del lavoro non è vuoto, prima di aprire la conversazione nuova Trama cerca fra i modelli di chat disponibili quello che il ruolo nomina: il nome mostrato nel selettore della chat, con o senza il fornitore fra parentesi (`<nome> (<fornitore>)`, oppure solo `<nome>` per il fornitore copilot). Se lo trova, la chat parte su quel modello, che resta anche nel selettore come se l'avesse scelto il developer. Se non lo trova, l'istruzione parte lo stesso, sul modello del selettore, e compare, a ogni istruzione in cui succede, un avviso di avvertimento senza pulsanti: `Trama: no Copilot model is named "<nome>" (<impostazione>). The instruction was sent with the model chosen in the chat.` con <nome> il valore del ruolo e <impostazione> il nome dell'impostazione del ruolo (per esempio trama.scan). Con il ruolo vuoto nessuna ricerca e nessun avviso. Un fallimento dei comandi della chat porta agli appunti come oggi.
