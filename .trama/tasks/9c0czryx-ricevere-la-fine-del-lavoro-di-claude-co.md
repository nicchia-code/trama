---
column: done
technical: false
refs:
  - agent-terminal/Agent running
  - agent-hook.IDLE
  - requirements/tech#agent-hook
  - requirements/tech#agent-launching
  - requirements/quality#agent-terminal
drift: null
proposal: u064bqz0
agent: false
created: 2026-10-10T12:49:58.391Z
finished: 2026-10-10T14:59:37.935Z
---
# Ricevere la fine del lavoro di Claude Code tramite i suoi hook

Ogni istruzione inviata a Claude Code in un terminale di Trama configura gli hook Stop e SessionEnd soltanto per quella corsa. La conclusione della risposta principale e l'uscita dell'agente inviano agent-hook.IDLE con l'identità del terminale, anche quando il comando rimane aperto in attesa del prompt successivo. La fine di un sotto-agente non conclude il lavoro principale. Gli hook usano il programma trama incluso nell'estensione tramite il suo percorso assoluto, con citazione per la shell e timeout di tre secondi, ignorando gli errori senza bloccare l'agente. Non vengono installati file di hook del progetto o dell'utente. Modello della corsa, modelli dei sotto-agenti e istruzione restano quelli previsti per il lavoro; se Claude Code rifiuta l'opzione degli hook, il comando parte comunque senza hook e la fine del comando o la chiusura del terminale restano osservabili.
