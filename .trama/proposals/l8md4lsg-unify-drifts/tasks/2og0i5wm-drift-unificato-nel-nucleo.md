---
technical: false
refs:
  - drift
  - drift.UNIFIED
  - agent.UNIFY_DRIFTS
  - proposal/Draft/drift.UNIFIED
  - proposal/Open/drift.UNIFIED
  - requirements/data#drift
  - requirements/data#drift/Unified
  - requirements/data#agent.UNIFY_DRIFTS
  - requirements/rules#agent.UNIFY_DRIFTS
  - requirements/cli#General
  - requirements/cli#agent.UNIFY_DRIFTS
  - requirements/tech#agent.UNIFY_DRIFTS
---
# Drift unificato nel nucleo

Quando questo Task è fatto, il nucleo di Trama e la riga di comando sanno registrare un **Drift unificato** e chiudere in un solo passo i Drift che unisce, nel nuovo stato finale **Unified**.

Che cosa deve valere:

- `trama drift new` accetta `unifies`, un elenco di Drift (identità permanenti o numeri brevi, convertiti prima di scrivere). È rifiutato, senza scrivere nulla e nominando ogni problema, quando i Drift sono meno di due o ripetuti, quando uno non esiste, non è aperto o sta in una Proposal di risoluzione in scrittura o aperta (anche `prepared: true`), quando `proposal` nomina una Proposal allegata a uno dei Drift uniti, quando ci sono anche `task` o `previous` (errore d'uso: con `unifies` li calcola Trama), o quando una qualunque regola di un Drift nuovo non vale. `dryRun` con `unifies` stampa i Task che il Drift unificato bloccherebbe, origini dei Drift uniti comprese.
- Riuscito, il Drift nuovo nasce Open, e nello stesso passo ogni Drift unito diventa `status: resolved`, `resolution: unified`, `unifiedInto: <identità del nuovo>`, perde il numero breve, la sua domanda pronta non vale più e la sua Proposal allegata, in scrittura o aperta, è scartata senza feedback (Event `drift.UNIFIED`; la Proposal va in Discarded da Draft e da Open). O succede tutto o nulla: se una scrittura fallisce, i file già scritti si ripristinano.
- Il Drift unificato ha `unifies` (identità dei Drift uniti, in ordine di creazione, senza doppioni). Le sue origini sono quelle dei Drift uniti, senza doppioni, nell'ordine di `unifies`; i suoi precedenti sono i precedenti dei Drift uniti più ogni Drift di cui un'origine è il Task di correzione, senza doppioni. Nel file `origin` e `previous` sono una stringa con un solo valore e una lista con più valori; ogni Drift si legge in entrambe le forme senza essere riscritto. Snapshot e `--json` portano `unifies`, `unifiedInto` e `origin` e `previous` sempre come liste.
- Il Drift unificato blocca ogni sua origine e ogni Task non Done che riguarda la stessa cosa, salvo i Task lasciati liberi con `notBlocking`, che deve nominare solo Task che bloccherebbe. Correggerne il codice (dalla riga di comando o da una risoluzione approvata) rimanda in To do ogni origine non Done, che aspetta il Task di correzione; accettare la Proposal o chiudere il Drift lascia ogni origine dov'è.
- Un Drift `unified` non è stato deciso: non conta fra i Drift già risolti quando si decide se registrare di nuovo una differenza, non può essere il `previous` di nessun Drift, rifiuta ogni `drift move`. `resolution: unified` senza `unifiedInto`, o `unifiedInto` con un'altra `resolution`, è un errore di lettura.
- `drift show` di un Drift unificato ha il blocco "Unifies" con `<identità> <titolo>` per Drift unito e una riga `Follows Drift …` per ogni precedente; `drift show` di un Drift unito ha `Unified into <numero breve o identità> <titolo>` subito dopo il titolo. `drift list` e `project show` segnano `(unifies <N>)`, e con `all` `drift list` segna `(unified into …)`. Riuscito, `drift new` stampa anche una riga `Unified <identità> into <identità del nuovo>` per Drift unito.
- Il modello scelto per una Proposal vale per Resolve su un Drift unificato solo se tutte le sue origini appartengono a quella Proposal.
- Le skill distribuite `trama-resolve-drifts`, `trama-scan`, `trama-implement`, `trama-import` e `trama-compare` sanno che un Drift può avere più origini e più precedenti e che un Drift `unified` non conta fra i Drift già risolti. `docs/cli.md`, il `--help` di `drift new`, `README.md`, `extension/README.md` e `CHANGELOG.md` descrivono `unifies` e Unify Drifts.
