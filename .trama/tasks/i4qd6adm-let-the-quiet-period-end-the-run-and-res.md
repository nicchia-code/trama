---
column: done
technical: false
refs:
  - drift-resolution/Running tasks/time.QUIET_PERIOD_ELAPSED
  - drift-resolution/Resolving/time.QUIET_PERIOD_ELAPSED
  - drift-resolution/Running tasks/agent-hook.IDLE
  - drift-resolution/Resolving/agent-hook.IDLE
  - requirements/rules#drift-resolution
  - requirements/tech#agent-hook
drift: null
proposal: m8luoq0k
agent: false
created: 2026-10-09T20:04:45.363Z
finished: 2026-10-09T20:37:30.719Z
---
# Let the quiet period end the Run and Resolve Drifts of a hooked agent, kept alive by its heartbeat

Un Run o una risoluzione dei Drift lanciati da Trama nel terminale di un agente con hook (omp, in qualunque launcher del terminale) sono lavori di cui Trama non può vedere la fine con certezza, quindi vale la quiete: oggi non vale mai, perché la fine di un terminale con hook è considerata sempre visibile.

Quando è fatto:
- la quiete finisce anche il lavoro di un terminale con hook dopo quindici minuti senza attività di quel terminale, sia in Running tasks sia in Resolving (per Resolving con le stesse conseguenze di ogni fine della risoluzione); la fine del comando continua a non finirlo, mentre `agent-hook.IDLE` e la chiusura del terminale lo finiscono come oggi;
- il segnale di vita dell'hook (`agent-alive`) di quel terminale fa ripartire i quindici minuti dei soli lavori di quel terminale, non di altri;
- anche i comandi di `trama` di sola lettura dell'agente riconosciuto (lanciati da un terminale avviato da Trama o dall'agente della chat di Cursor) fanno ripartire la quiete del lavoro del loro terminale o della loro chat, come quelli che cambiano qualcosa; un comando del developer nella sua shell no;
- i quindici minuti restano fermi mentre un round di domande è aperto e ripartono alla sua chiusura;
- se l'hook non si carica non arriva nessun segnale e il lavoro finisce dopo quindici minuti senza altra attività.

L'invio del segnale di vita da parte dell'hook, il comando `trama agent-event alive`, l'idle mandato solo dalla sessione principale e l'invio dei comandi di sola lettura all'editor sono nel Task wyn38oe4; il rilascio dei Task presi quando la quiete finisce il lavoro di un terminale con hook è nel Task di `task`. Il confronto della quiete fra più Run insieme è il Drift tedlgfp3 e non cambia qui.
