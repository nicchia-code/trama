---
column: done
technical: false
refs:
  - announcement/Checking
  - announcement/Checking/agent.FINISH_CHECK
  - announcement/Verifying/agent.CHANGE_CHECK_PHASE
  - agent.CHANGE_CHECK_PHASE
  - agent.FINISH_CHECK
  - requirements/data#announcement
  - requirements/rules#announcement
  - requirements/tech#announcement
drift: null
proposal: h1ezgi8s
agent: false
created: 2026-10-06T21:29:22.596Z
finished: 2026-10-06T21:31:07.898Z
---
# Annunciare, far avanzare e chiudere un controllo dalla riga di comando

Un annuncio può essere un **controllo**: `trama announce check "<title>" --phase verifying|scanning` lo crea già in Verifying o in Scanning e ne stampa l'ID, copiando `terminal` o `chat` come ogni annuncio. `--phase` è obbligatorio per `check` e rifiutato per gli altri tipi.

Quando è fatto:
- il file dell'annuncio ha `kind: check`, `phase` (`verifying` o `scanning`), `source: agent`, nessun `proposal`; il titolo è l'H1;
- `trama announce phase <id> scanning` passa un controllo da Verifying a Scanning (CHANGE_CHECK_PHASE); su un controllo già in Scanning non cambia nulla e lo dice;
- `trama announce done <id>` consegna il controllo (FINISH_CHECK) e ne cancella il file, senza avvisi;
- annuncio e cambio di fase aggiornano `touched`, così contano come attività nei quindici minuti di quiete;
- un ID sconosciuto, già consegnato o ritirato, o che non è un controllo, non è un errore: l'uscita dice che il controllo non è stato trovato e il comando finisce con successo;
- nessuno dei comandi è riservato al developer;
- la Snapshot legge i controlli con il loro tipo e la loro fase, e `docs/cli.md` descrive i tre comandi.
