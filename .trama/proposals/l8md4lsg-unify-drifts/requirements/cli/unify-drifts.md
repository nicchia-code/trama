---
description: "Usa quando cambi `trama drift new` con `unifies` o ciò che `drift show`, `drift list` e `project show` dicono dei Drift unificati e uniti."
---
# Unify Drifts nella riga di comando

## agent.UNIFY_DRIFTS
- `drift new` accetta `unifies`: un elenco di Drift, ciascuno come identità permanente o numero breve, convertito prima di scrivere. Con `unifies`, `task` e `previous` sono un errore d'uso che nomina il campo; `dryRun: true` con `unifies` stampa i Task che il Drift unificato bloccherebbe, origini dei Drift uniti comprese, senza scrivere nulla.
- Un rifiuto esce con 1 e nomina ogni problema in una riga (per esempio `Drift D3 is part of resolution <id>`); non scrive nulla.
- Riuscito, stampa l'identità del Drift nuovo come ogni `drift new` e una riga per ogni Drift unito, `Unified <identità> into <identità del nuovo>`; con `--json` aggiunge `unifies`.
- `drift show` di un Drift unificato ha, dopo i due lati, un blocco con l'intestazione "Unifies" e una riga per Drift unito (`<identità> <titolo>`); con più precedenti una riga `Follows Drift …` per ciascuno, nell'ordine di `previous`. `drift show` di un Drift unito ha, subito dopo il titolo, la riga `Unified into <numero breve o identità> <titolo>`.
- `drift list` e `project show` segnano un Drift unificato aperto `(unifies <N>)`; con `all`, `drift list` segna un Drift unito `(unified into <numero breve o identità>)`.
- `drift move` su un Drift unito è rifiutato come su ogni Drift risolto.
- `docs/cli.md` e il `--help` di `drift new` descrivono `unifies`.
