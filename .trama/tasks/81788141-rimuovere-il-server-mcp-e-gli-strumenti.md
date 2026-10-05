---
column: done
technical: true
refs:
  - requirements/tech#General
  - requirements/tech#question-round
  - requirements/rules#task
drift: null
proposal: null
agent: false
created: 1970-01-01T00:00:00.106Z
---
# Rimuovere il server MCP e gli strumenti dell'agente dalla riga di comando

Quando è finito, l'agente raggiunge Trama solo con i comandi della riga di comando.

- `trama mcp` non esiste più: non compare nell'aiuto e viene rifiutato come comando sconosciuto.
- Il catalogo degli strumenti dell'agente (`src/tools`) e il server MCP non esistono più, e nessun altro codice li usa.
- `trama ask` funziona come prima: richiesta JSON da standard input, risultato JSON su standard output, interruzione con SIGINT/SIGTERM, `--root`, indisponibilità iniziale dell'editor ed `editor-interrupted`. Non dipende più dal nome di un client e identifica sempre se stesso come `trama ask`.
- Un agente prende un Task solo spostandolo in corso con il comando `trama task move` nel terminale marcato con `TRAMA_AGENT`; non esiste più un percorso 'via strumento' per prenderlo.
- I test che passavano dagli strumenti o da MCP sono eliminati o riscritti sui comandi della riga di comando, che coprono le stesse regole (annunci, Task, Drift, blocchi, domande).
