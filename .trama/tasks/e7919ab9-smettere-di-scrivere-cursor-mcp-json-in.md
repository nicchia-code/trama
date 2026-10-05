---
column: done
technical: true
refs:
  - requirements/tech#project
  - requirements/tech#General
drift: null
proposal: null
agent: false
created: 1970-01-01T00:00:00.108Z
---
# Smettere di scrivere .cursor/mcp.json in Cursor

In Cursor l'estensione non scrive più `.cursor/mcp.json` e non mostra più messaggi sul server MCP.

- Una voce `trama` già presente nel file resta com'è: non viene letta, cambiata né cancellata, e il file illeggibile non genera avvisi.
- La cartella del binario `trama` incluso nel pacchetto continua a essere messa in testa al PATH dei terminali dell'editor, così l'agente trova la riga di comando.
- Il rilevamento di Cursor serve solo dove ancora cambia il comportamento (la chat copia il prompt negli appunti).
