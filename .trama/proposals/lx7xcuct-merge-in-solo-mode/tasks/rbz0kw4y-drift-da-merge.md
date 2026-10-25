---
refs:
  - drift
  - requirements/data#drift
  - requirements/rules#drift
  - requirements/tech#drift
  - requirements/ui#drift
  - requirements/rules#drift-resolution
  - requirements/rules#question-round
---
# Drift da merge

Lo scan dopo un Merge in Solo mode (lanciato da un altro Task della stessa Proposal, con un'istruzione che nomina l'intervallo `<base>...<incoming>` portato dal merge) segna come Drift da merge ogni Drift il cui Where in the code sta in un file di quell'intervallo. Gli altri hanno cambiato quel codice senza il Model, quindi il codice potrebbe essere giusto.

A Task finito:

- `trama drift new` e ogni Drift del blocco di `trama comparison move … delivered` accettano `merge` (booleano, `false` di default), scritto nel front matter come `merge: true` solo quando vero; non cambia più. Un valore diverso da `true` vale non da merge. Unify Drifts scrive `merge: true` sul Drift unificato quando almeno uno dei Drift uniti lo ha.
- `trama drift show` mostra la riga `From a merge` subito dopo il titolo; `trama drift list` e `trama project show` segnano il Drift `(merge)`; la Snapshot e i `--json` portano `merge` come booleano.
- Board, righe di una risoluzione e dettagli del Diagramma mostrano il badge testuale `Merge` accanto agli altri, con tooltip e nome accessibile `From a merge: the code may be right, keeping it is recommended`; come `recurring`, non apre nulla e non sposta il focus.
- Le skill `trama-scan` e `trama-compare`: con l'intervallo di un merge nell'istruzione, l'agente principale lo passa a ogni sotto-agente che confronta una Machine, e ogni Drift il cui Where in the code sta in un file di `git diff --name-only <base>...<incoming>` è archiviato con `merge: true`. Solo questo scan segna Drift da merge. Le Fix options restano quelle di ogni Drift: tenere il codice non è mai una Fix option.
- La domanda di `trama-resolve-drifts` e la domanda pronta dell'Async Drift Resolver per un Drift da merge hanno sempre l'opzione del comportamento che il codice ha già (decisione `proposal` con la Proposal allegata che adegua Model e Requisiti, o `dismissed` se li dicono già) e la raccomandano, qualunque cosa sceglierebbe l'agente; il `context` dice che il Drift viene dal codice portato da un altro branch con un merge. Per un Drift da merge senza Fix options resta raccomandato adottare la Proposal allegata.
