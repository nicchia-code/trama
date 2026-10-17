---
column: done
technical: false
refs:
  - voce-history
  - agent.VOCE_HISTORY_SCRITTA
  - agent.VOCE_HISTORY_AGGIORNATA
  - requirements/data#voce-history
  - requirements/tech#voce-history
drift: null
proposal: uvn8ulmq
agent: false
created: 2026-10-17T10:26:31.354Z
finished: 2026-10-17T10:47:14.838Z
---
# Voci di History: file, core, comandi `trama history` e Snapshot

Quando il Task è finito, una voce di History esiste come file `.trama/history/<id>-<slug>.md` (identità di 8 caratteri unica fra le voci, slug dal titolo alla scrittura e mai cambiato dopo; cartella creata con la prima voce, senza `.gitignore`, versionata come `tasks/` e `drifts/`). Il front matter ha solo `created`, `updated` (UTC, ISO 8601; `updated` è la data della voce), `summary` (una riga, 1–280 caratteri) e `tasks` (identità permanenti, senza doppioni, nell'ordine di aggiunta); l'H1 è il titolo e il corpo dopo l'H1 è il testo completo, anche vuoto.

In `src/core` ci sono lettura, validazione e scrittura delle voci (scrittura via file provvisorio poi rinominato):
- `agent.VOCE_HISTORY_SCRITTA` (Assente → Registrata): `trama history add "<titolo>" --summary <testo> [--body <testo>] --task <id>…` scrive la voce con `created` e `updated` all'istante del comando e stampa l'identità. Rifiutata senza scrivere nulla, con uscita di errore che nomina ogni problema, quando il titolo è vuoto o su più righe, il riassunto è vuoto, su più righe o oltre 280 caratteri, nessun Task è citato, o un Task citato non esiste, non è Done o è chiuso `unchanged`.
- `agent.VOCE_HISTORY_AGGIORNATA` (Registrata → Registrata): `trama history update <id> [--title] [--summary] [--body] [--task <id>…]` può riscrivere titolo, riassunto e testo e aggiunge i Task nuovi senza doppioni né togliere quelli citati; `updated` diventa l'istante del comando anche se nulla cambia. Rifiutato, lasciando il file com'era, alle stesse condizioni per i Task aggiunti e per titolo/riassunto dati.
- I Task si nominano con identità o numero breve, ma nel file va sempre l'identità; un Task citato che poi lascia Done o non esiste più resta nella lista. I comandi non sono riservati al developer.
- `trama history list [--json]` elenca le voci, la più recente prima, con identità, data e titolo; `trama history show <id> [--json]` stampa titolo, data, riassunto, testo e i Task citati con il loro stato. Testi in inglese.
- La fase History del controllo finale (`trama announce phase <id> history`) non fa parte di questo Task: la implementa un altro Task di questa Proposal, e la skill `trama-implement` la usa.

Le voci non hanno numero breve e non entrano in `short-numbers/`; `trama ids rewrite` porta alla nuova identità anche i Task citati in `tasks`. La Snapshot legge `.trama/history/` con il resto di `.trama/` e porta le voci con titolo, riassunto, testo, date e i Task citati con stato, titolo, tag, `finished` e riferimenti (un Task che non esiste più è segnalato come tale); un file che non si legge è un errore della Snapshot e le altre voci restano. Nessuna voce è creata per il lavoro finito prima di History. Aggiornare `docs/cli.md` con i nuovi comandi `trama history`, e aggiungere test per validazione, aggiornamento, `ids rewrite` e lettura della Snapshot.
