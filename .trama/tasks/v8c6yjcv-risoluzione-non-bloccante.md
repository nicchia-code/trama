---
column: done
technical: false
refs:
  - proposal
  - requirements/data#proposal
  - requirements/rules#drift-resolution
  - requirements/ui#drift-resolution
drift: null
proposal: oxnsbjqr
agent: false
created: 2026-10-17T16:27:29.470Z
finished: 2026-10-17T17:55:33.634Z
---
# Risoluzione `nonBlocking` dei Drift che non bloccano nulla

Quando il Task è finito, una Proposal di risoluzione può portare il campo `nonBlocking: true` (assente o `false` per tutte le altre Proposal, e per tutte le Proposal già esistenti). Lo scrive solo `trama proposal new --resolution --non-blocking`: `--non-blocking` senza `--resolution`, oppure insieme a `--automatic`, è un errore d'uso (`UsageError`) e non crea nulla. La validazione rifiuta `nonBlocking` su una Proposal che non è una risoluzione, e su una risoluzione automatica. Il punto da toccare è il comando `proposal new` in `src/cli/commands.ts` (accanto ai controlli di `--import`, `--job`, `--setup`), il dato della Proposal e la sua validazione in `src/core`, e il riassunto in `src/cli/work.ts`.

Le skill distribuite che registrano Drift (`skills/trama-scan`, `skills/trama-implement`, `skills/trama-import`, e il prompt `trama-analysis` in `src/core/sub-agents.ts` per ciò che il sotto-agente restituisce all'agente principale) hanno un passo finale: con l'impostazione Experimental Drift Blocker accesa, l'agente principale dello scan, della Run o dell'import raccoglie alla fine i Drift registrati in quel lavoro che non bloccano nulla e scrive per loro una sola risoluzione `nonBlocking`. Entrano solo i Drift non bloccanti che non sono critici, non sono ricorrenti e che la delega non tratterebbe da sola: la delega si legge con `trama drift autopilot --json`, e se non si può leggere (editor o coordinatore assenti) vale come disattivata, quindi il Drift va nella risoluzione. Un Drift critico, ricorrente o ammissibile per la delega resta Drift aperto. Per ogni Drift la risoluzione porta la decisione raccomandata: `fix-code` con la prima opzione di correzione, oppure `proposal` quando il Drift allegherebbe una Proposal o non ha opzioni; con una Proposal allegata la risoluzione porta in sé le stesse modifiche al Modello, e l'allegata è messa da parte all'approvazione come oggi. L'agente scrive l'annuncio della risoluzione, la valida e la consegna, senza mai approvarla. Se nessun Drift entra, non nasce nessuna risoluzione.

La risoluzione così nata è manuale: la approva o la rifiuta il developer, e finché è aperta ferma Resolve all, Resolve e la raccolta automatica esattamente come ogni altra risoluzione aperta.

Nella Board la scheda gialla di una risoluzione `nonBlocking` mostra un badge testuale `blocks nothing`, con un tooltip che spiega che i suoi Drift non bloccano nessun Task e lo stesso significato nel nome accessibile della scheda (`extension/`, rendering della scheda della Proposal). `trama board` e `trama proposal list` aggiungono `(blocks nothing)` alla riga di quella Proposal, accanto al segno `(resolves N Drifts)`.

Docs e `CHANGELOG.md` descrivono il flag `--non-blocking`, il campo `nonBlocking` e il badge.
