---
technical: true
refs:
  - requirements/tech#drift
  - requirements/tech#panel/Board
  - requirements/tech#editor-chat
---
# Briefing e archiviazione in blocco

I due comandi del confronto di una Machine, in `src/core` con la riga di comando in `src/cli`, come li descrive `tech#drift`.

Fatto quando:
- `trama compare brief <machine> [--ref <ref>…] [--candidates] [--json]` annuncia il confronto e ne stampa l'ID in testa, poi in un'unica uscita i riferimenti da confrontare, l'albero degli stati, gli eventi con chi li riceve e le Transition di quei riferimenti, il testo di ogni sezione di Requisiti che vi si applica una sola volta (senza General e senza nominare skill da caricare), gli avvisi di `trama analyze <machine>`, i Task e i Drift aperti sulla stessa cosa, i Drift risolti o dismessi sugli stessi riferimenti con decisione e nota e, con `--candidates`, i Task che un Drift su ciascun riferimento bloccherebbe; una Machine o un riferimento che non si risolve è un errore d'uso e non annuncia nulla;
- `trama compare file <id del confronto> <file.json|->` controlla tutte le schede prima di scrivere con le stesse regole di `task new` e `drift new` (`design`, `tasks`, `drifts` con `options`, `critical`, `previous`, `proposal`, `notBlocking`); con una scheda non valida non scrive nulla, esce con errore ed elenca i problemi per scheda; altrimenti crea le schede in ordine, consegna il confronto e stampa identità, numero breve, titolo e le righe dei Drift ricorrenti; un ID che non è un confronto in attesa non impedisce l'archiviazione;
- un Drift del blocco con `proposal` allega la Draft come `drift new --proposal`;
- `trama compare file`, quando riesce, manda all'editor l'identità di ogni scheda con la provenienza, così le schede aspettano la fine del turno dell'agente come le altre;
- `afterShellExecution` di Cursor registra il lavoro dell'agente anche per `compare brief`;
- `docs/cli.md` descrive i due comandi e il formato del file, con la nota per PowerShell.
