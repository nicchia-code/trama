---
technical: false
refs:
  - agent-launching
  - agent-terminal
  - requirements/rules#agent-terminal
  - requirements/tech#agent-terminal
  - requirements/ui#agent-terminal
  - requirements/tech#agent-launching
  - specs#infrastructure
---
# omp prima dei lanci

omp è obbligatorio e Trama lo tiene aggiornato prima di ogni lancio. Il Task si appoggia sul programma omp unico introdotto dalla Proposal precedente (`trama.ompPath` o `omp`). Alla fine:

- Ricerca del programma: con `trama.ompPath` vuota, Trama usa il primo `omp` trovato nel `PATH` dell'editor, poi in `.bun/bin` e poi in `.local/bin` della cartella home (`os.homedir()`), con `omp.exe` su Windows; con `trama.ompPath` impostata, solo quel percorso. Nessun programma trovato vuol dire che omp manca. Trama non scrive mai `trama.ompPath`. La stessa funzione serve terminali, omp Chat, `omp models --json` e verifiche; la cartella del programma trovato va in testa al PATH dei processi di omp, con quella di bun.
- Prima di ogni lancio di omp (design, scan, import, implement, implement all e ogni Run di una sequenza per modello, Resolve Drifts, Unify Drifts, Ask more, Quick Task; nel terminale o in omp Chat; non la ripresa di una conversazione dopo una ricarica), prima di creare terminale, conversazione, annuncio o lavoro:
  1. se omp manca il lancio non parte (nessun terminale, conversazione, annuncio, lavoro; una sequenza per modello si ferma come quando un'istruzione non parte) e compare l'avviso non modale `Trama: omp is not installed. Trama runs every agent with omp.` con i pulsanti `Install omp` (apre il terminale di installazione, vedi il Task Install omp) e `Open Settings` (apre il pannello sulla scheda Settings, anche se chiuso); il lavoro non riparte da sé;
  2. se l'esito dell'ultimo controllo vale ancora, il lancio parte subito;
  3. altrimenti Trama esegue `omp update --check`; senza versione nuova il lancio parte;
  4. con una versione nuova Trama esegue `omp update` con la notifica di avanzamento `Updating omp to <versione>…` (senza annulla) e lancia quando finisce;
  5. se controllo o aggiornamento falliscono, il lancio parte con l'omp di prima e compare, una volta per controllo, l'avviso informativo `Trama: could not update omp (<motivo>). The agent runs with omp <versione>.` (`the installed version` quando la versione non è nota).
- Nessuna conferma prima di aggiornare: l'aggiornamento è sempre automatico.
- Esito del controllo: vale un'ora dal momento del controllo, riuscito o fallito, per tutte le finestre dell'editor e per lo stesso programma omp; sta in `ExtensionContext.globalState`, chiave `trama.ompUpdateCheck`, `{ checkedAt, omp, version? }`. Un cambio di `trama.ompPath` o la fine del terminale di installazione lo dimenticano. Dentro una finestra un controllo o un aggiornamento in corso è una sola promessa che i lanci successivi aspettano, senza un secondo controllo.
- `omp update --check` e `omp update` partono con `execFile`, senza shell, con argomenti fissi, con il programma omp e lo stesso PATH di `omp models --json`; scadenze 30 s per `--check` e 5 minuti per `omp update`, che valgono come fallimento. Lettura di `--check` (esce con 0 in entrambi i casi, provato con omp 18.12.6): standard output senza codici di colore; `Current version: <v>` dà la versione, `New version available: <v>` una versione nuova, `Already up to date` nessuna, una riga che dice che omp è tenuto aggiornato da un altro programma vale come aggiornato. Motivi: `omp update --check exited with code <N>`, `omp update --check did not answer within 30 s`, `omp update --check gave an unexpected answer`, `omp update exited with code <N>`, `omp update did not finish within 5 minutes`. Le uscite di omp non entrano nei motivi né nei log.
- Il controllo sta in un solo modulo dell'host, chiamato da `launchAgent`, dall'apertura di una conversazione di omp Chat, da `openQuickTask`, da `openAskMore` e dalla verifica del wizard; la parte pura (lettura delle uscite, validità dell'esito, ricerca del programma) sta in `src/core`, con test `bun:test` per: le due uscite di `--check`, un'uscita inattesa, la scadenza dell'ora, il cambio di programma, l'ordine di ricerca delle cartelle.
- La descrizione di `trama.ompPath` è «Path of the `omp` program Trama runs for every agent, the model list and the checks. Empty looks for `omp` in the editor's PATH, then in `~/.bun/bin` and `~/.local/bin`.». Le Specs elencano omp in `infrastructure`. `README.md` dice che omp è obbligatorio, che Trama lo installa quando manca e lo aggiorna prima dei lanci; `CHANGELOG.md` lo registra; `docs/uat.md` ha i passi per omp mancante, aggiornato e da aggiornare, e per un controllo senza rete.
