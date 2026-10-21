---
technical: true
refs:
  - requirements/ui#drift
---
# Resolve e dettagli del Drift

Nel pannello un Drift singolo si risolve con Resolve o si chiude con Dismiss Drift; non esiste più Resolve all, quindi i testi e i dettagli del Drift non vi rimandano più.

A lavoro finito:

- «Resolve» sulla scheda rossa ha l'icona `wand` e il tooltip `Ask an agent to resolve this Drift`, senza alcuna spiegazione di una modalità di delega. Quando non si può usare resta visibile, appare disabilitato ed è segnato come disabilitato per le tecnologie assistive, con i motivi nel tooltip e nella descrizione accessibile, in quest'ordine quando ne valgono più d'uno: `The agent is still finishing`, `An agent is resolving this Drift` (l'agente di risoluzione lavora proprio su quel Drift), `Drifts are being resolved`, `A run is in progress`, `Proposal <id> resolving Drifts awaits a decision` (la più vecchia ancora in scrittura o aperta). I motivi sono propri di Resolve, non più derivati da quelli di `Resolve all` (in `extension/src/webview/board/logic.ts`), e non c'è più `No open Drifts`.
- Ogni altra decisione sui Drift, nel pannello, passa da Resolve; nessun testo del Drift nomina Resolve all.
- Nei dettagli aperti della scheda rossa in `Backlog` stanno, nell'ordine, la riga di chip dei riferimenti (prima dei due lati, con navigazione e tooltip invariati; assente senza riferimenti), i due lati `What happens` / `What should happen` e la riga `Not blocking: …`. Quella riga non sta più sotto i Task bloccati (che non compaiono più sotto i Drift): compare nei dettagli della scheda rossa e sulla riga del Drift nella scheda gialla, con i numeri brevi dei Task lasciati liberi, tooltip e nome accessibile `Not blocked by this Drift: <motivo>`, e manca senza Task da mostrare.
- I dettagli del Diagramma restano disponibili per ogni Drift aperto, con soltanto «Dismiss Drift».
- Nessun Drift ha un badge d'urgenza nella scheda, nelle righe della risoluzione o nei dettagli del Diagramma.
- I test del webview (`test/board-logic.test.ts`, `test/board-render.test.tsx`) coprono l'ordine dei motivi di Resolve e la posizione di chip e `Not blocking` nei dettagli.
