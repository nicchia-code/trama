# Requirements: Dati, Dati di Unify Drifts

Usa quando tocchi i campi dei Drift unificati e dei Drift uniti: `unifies`, `unifiedInto`, `resolution: unified` e `origin` e `previous` come liste.

## agent.UNIFY_DRIFTS

- Il front matter del Drift unificato contiene `unifies`: la lista delle identità permanenti dei Drift che unisce, nell'ordine di creazione di quei Drift, senza doppioni. Si scrive alla creazione e non cambia più; è assente in ogni altro Drift.
- Nel Drift unificato `origin` e `previous` sono una stringa quando c'è un solo valore e una lista quando ce n'è più d'uno; assenti quando non ce n'è nessuno. Ogni Drift si legge con entrambe le forme, senza riscriverlo; una lista vuota vale come assente.
- La Snapshot e i `--json` di `drift show`, `drift list` e `project show` portano `unifies` (lista, vuota se assente) e `unifiedInto` (identità o `null`), e `origin` e `previous` sempre come liste, vuote se assenti.

## drift/Unified

- Un Drift unito ha `status: resolved`, `resolution: unified` e `unifiedInto`: l'identità permanente del Drift unificato in cui è confluito. Si scrivono nello stesso passo della creazione del Drift unificato e non cambiano più. Gli altri campi restano com'erano, `proposal` compreso, anche se quella Proposal è stata scartata; non ha `task`, `option`, `note` né `resolvedBy`.
- `unifiedInto` è assente in ogni altro Drift; un Drift con `resolution: unified` senza `unifiedInto`, o con `unifiedInto` e un'altra `resolution`, è un errore di lettura.
