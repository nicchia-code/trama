---
technical: false
refs:
  - prenotazione-file
  - agent.SCRITTURA_FILE_CHIESTA
  - agent-hook
  - requirements/rules#prenotazione-file
  - requirements/tech#prenotazione-file
  - requirements/data#prenotazione-file
  - requirements/tech#agent-hook
---
# Prenotazioni nell'hook

Durante un Run, l'hook di Trama in omp prenota i file di codice per il sotto-agente che li scrive per primo e ferma chi prova a scriverli dopo di lui, prima che il file cambi.

Quando è fatto:
- L'estensione aggiunge `TRAMA_RUN=1` all'ambiente del terminale o della conversazione di omp Chat solo per i Run (implement di un Task, implement all, ogni Run di una sequenza per modello), accanto a `TRAMA_AGENT`, `TRAMA_TERMINAL` e `TRAMA_JOB`. Ogni altro lavoro non la ha.
- Il modulo dell'hook (`extension/src/omp/trama-hook.ts`), con `TRAMA_TERMINAL` e `TRAMA_RUN=1`, guarda `tool_call` di `write`, `edit`, `apply_patch` e `ast_edit`: ricava i percorsi dall'input (`path`, e per `edit` anche `paths`), li risolve rispetto a `ctx.cwd` e ignora quelli fuori dal progetto.
- Un sotto-agente (`ctx.agent.kind` `"sub"`) che scrive un file libero lo prenota. Lo stesso sotto-agente, o un sotto-agente avviato da lui (catena di `ctx.agent.parentId`), scrive e rinnova la prenotazione. Ogni altro agente, sotto-agente o principale, dello stesso terminale o di un altro, è fermato con `{ block: true, reason }` e il messaggio di `rules#prenotazione-file` ("… is claimed by sub-agent <agente> of this run …", oppure "of another run"). L'agente principale non prenota mai; un advisor (`ctx.agent.id` `"advisor"`) non prenota e non è fermato.
- Una chiamata con più percorsi è fermata per intero se uno solo è fermato, senza prese parziali.
- Una prenotazione non rinnovata da 2 ore è scaduta: la scrittura successiva di un altro sotto-agente la prende per sé; quella dell'agente principale la cancella e scrive.
- Controllo e presa avvengono insieme, in modo sincrono, sotto il lock breve `withFileLock` della cartella `.trama/claims/`, che ha un file `<sha256 del percorso relativo>.json` per file prenotato con `{ path, terminal, agent, ancestors, claimedAt, renewedAt }` e il suo `.gitignore` con `*`.
- Un errore di lettura o scrittura delle prenotazioni ferma la scrittura con il messaggio "Trama could not check the claim of <percorso>: <motivo>. …"; il gestore non lancia mai eccezioni e non contatta l'editor.
- `agent_end` di un sotto-agente (non advisor) senza `willContinue: true` cancella le prenotazioni di quel sotto-agente in quel terminale (`agent-hook.SOTTO_AGENTE_FINITO`).
- Quando l'estensione chiude il lavoro di un terminale (hook a riposo, fine del comando, chiusura del terminale, fine della conversazione di omp Chat, controllo di esecuzione), cancella tutte le prenotazioni con quel `TRAMA_TERMINAL`, nello stesso passo in cui rilascia i Task presi.
- La logica sta in `src/core`, senza `vscode`, inclusa nel modulo dell'hook dalla build. I test `bun:test` coprono ogni caso elencato in `tech#prenotazione-file`; `test/omp-hook.test.ts` prova i gestori con l'omp finto, compreso che senza `TRAMA_RUN` gli strumenti di scrittura non ritornano nulla e che `ask` resta rifiutato come oggi.
- `docs/` e `CHANGELOG.md` descrivono le prenotazioni.
