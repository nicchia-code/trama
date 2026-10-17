---
technical: false
refs:
  - announcement/Al lavoro
  - announcement/Delivered
  - announcement/Announced/terminal.COMMAND_ENDED
  - announcement/Announced/terminal.CLOSED
  - announcement/Announced/agent-hook.IDLE
  - announcement/Announced/editor-chat.AGENT_STOPPED
---
# Annuncio di tipo lavoro per l'import, chiuso in silenzio dalla fine dell'agente

Quando il Task è finito, un announcement può essere un lavoro: `kind: work`, `source: request`, senza `phase` né `proposal`, con H1 `Importing from code`. Lo scrive l'estensione al lancio di un import, con `terminal` o `chat` come gli altri annunci di lancio, e nasce già Al lavoro (mai Preparing). Le schede che l'agente annuncia nel frattempo hanno i loro ghost accanto al suo e seguono le loro regole.

Un lavoro non arriva mai come scheda e non si consegna con un comando: è Delivered, e il file è cancellato senza alcun avviso, quando l'hook dell'agente del suo terminale va a riposo, quando finisce il comando che Trama ha scritto in quel terminale, quando il terminale è chiuso, oppure, per un lavoro lanciato nella chat, quando una conversazione di Trama del progetto finisce il turno, è interrotta o è chiusa. All'avvio dell'editor è tolto senza avviso come gli altri annunci.

Gli stessi segnali, per gli annunci che non sono un lavoro, continuano a ritirarli con l'avviso `The agent finished without delivering …`; la fine del turno della chat ritira con l'avviso anche gli annunci che Trama ha fatto lanciando un'istruzione nella chat. Un lavoro non produce mai quell'avviso. Aggiornare i test dell'host sul ritiro degli annunci.
