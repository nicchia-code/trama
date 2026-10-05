---
column: done
technical: true
refs:
  - requirements/tech#General
  - requirements/tech#question-round
drift: null
proposal: null
agent: false
created: 1970-01-01T00:00:00.111Z
---
# Aggiornare documentazione, ADR e script di accettazione per la sola riga di comando

La documentazione descrive solo la riga di comando come via dell'agente.

- Il README e il README dell'estensione non parlano più di strumenti nativi, MCP, `trama_ask` né di `.cursor/mcp.json`; spiegano che l'agente usa `trama` e fa le domande con `trama ask`.
- In `docs/cli.md` sparisce la sezione sugli strumenti e MCP, e le sezioni sui round di domande non citano più strumenti nativi, MCP né le notifiche di annullamento MCP; l'aiuto del comando non cita `trama mcp`; i comandi `task list`/`board` non citano più gli strumenti.
- Lo script di accettazione (`docs/uat.md`) non ha più passi per strumento nativo o MCP, e il titolo del Quick Pick è sempre `trama ask`.
- L'ADR 0006 è segnato come sostituito da un nuovo ADR che dice che gli agenti usano solo la riga di comando, con le conseguenze accettate della Proposal 0026 (guardia sviluppatore basata su `TRAMA_AGENT`, agente fuori dal terminale di Trama che non prende i Task).
