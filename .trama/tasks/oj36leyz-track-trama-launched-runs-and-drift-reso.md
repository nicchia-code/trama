---
column: done
technical: false
refs:
  - drift-resolution/Free/developer.ASK_AGENT
  - drift-resolution/Running tasks
  - drift-resolution/Running tasks/terminal.COMMAND_ENDED
  - drift-resolution/Running tasks/terminal.CLOSED
  - drift-resolution/Running tasks/cursor-chat.AGENT_STOPPED
  - drift-resolution/Running tasks/cursor-chat.AGENT_INTERRUPTED
  - drift-resolution/Running tasks/cursor-chat.CONVERSATION_CLOSED
  - drift-resolution/Running tasks/time.QUIET_PERIOD_ELAPSED
  - drift-resolution/Resolving
  - drift-resolution/Resolving/terminal.COMMAND_ENDED
  - drift-resolution/Resolving/terminal.CLOSED
  - drift-resolution/Resolving/cursor-chat.AGENT_STOPPED
  - drift-resolution/Resolving/cursor-chat.AGENT_INTERRUPTED
  - drift-resolution/Resolving/cursor-chat.CONVERSATION_CLOSED
  - drift-resolution/Resolving/time.QUIET_PERIOD_ELAPSED
  - requirements/data#drift-resolution
  - requirements/rules#drift-resolution
drift: null
proposal: hlnh5d44
agent: false
created: 2026-10-09T07:11:10.375Z
finished: 2026-10-09T08:21:31.822Z
---
# Track Trama-launched runs and Drift resolution until they end

Ogni finestra dell'editor sa, solo in memoria, quali lavori lanciati da Trama dai suoi pulsanti sono ancora in corso: i Run (Run all To do, il Run di un Task, Run this design) e l'unico Resolve Drifts, ciascuno con il terminale (la sua identità) o la conversazione della chat in cui gira e l'istante dell'ultima attività vista. Nulla è scritto sotto `.trama/` né nello stato dell'area di lavoro; riaprire l'editor riparte da Free.

- Un lavoro è in corso solo dal momento in cui la sua istruzione è davvero scritta nel terminale o inviata dalla chat da sola; un'istruzione lasciata pronta in chat o copiata negli appunti non apre nulla. Un agente avviato dal developer senza Trama non conta.
- Un lavoro in un terminale finisce con la fine del comando che Trama vi ha scritto (stesse regole che ritirano gli annunci: la fine di un altro comando non conta) o con la chiusura di quel terminale. Un lavoro nella chat di Cursor finisce con la prima fine di turno, interruzione o chiusura di una conversazione di Trama dello stesso progetto arrivata dopo il suo invio.
- Solo per i lavori di cui Trama non vede la fine con certezza (finestra del terminale esterno, terminale integrato senza fine dei comandi, chat di un editor che non è Cursor) vale la quiete: quindici minuti senza un comando `trama` dell'agente che cambi qualcosa (annuncio, Proposal nuova, file o decisione registrati, consegna, Drift o Task archiviato, Task spostato) dal suo terminale o dalla chat; il conteggio si ferma mentre un round di domande è aperto e riparte quando si chiude. Un lavoro con una fine visibile non scade mai per quiete.
- Più Run possono essere in corso insieme, ognuno seguito per conto suo: la Machine torna in Free solo quando è finito l'ultimo. La fine di Resolve Drifts riporta subito in Free.

Fatto quando lo stato Free / Running tasks / Resolving della finestra segue esattamente queste regole ed è leggibile da chi decide i lanci e dal pannello.
