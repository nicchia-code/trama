---
status: resolved
resolution: proposal
refs:
  - drift/Open/developer.FIX_DRIFT_CODE
  - requirements/rules#drift
proposal: null
task: null
origin: null
option: null
note: null
resolvedBy: 207t8egb
created: 2026-10-09T19:25:40.513Z
---
# Fixing the code of a Drift whose references no longer resolve is not in the Model

## What happens

Quando il developer tiene ciò che dovrebbe succedere su un Drift i cui riferimenti **non si risolvono più** (elementi rinominati o tolti dopo l'archiviazione):

- il Task di correzione non punta agli stessi elementi del Drift: ognuno sparito è sostituito dal **contenitore più vicino** ancora presente (lo Stato o la Machine, l'Area per un Requisito), e uno senza contenitore è lasciato fuori;
- se del Modello non resta nulla, nemmeno un contenitore, la correzione è **rifiutata** e il Drift resta Open, con il messaggio che si può solo chiudere.

Vale anche per la decisione di correggere il codice in una risoluzione.

## What should happen

Il Modello e `rules#drift` dicono che correggere il codice crea **sempre** un Task che punta **agli stessi elementi** del Drift; l'unico rifiuto previsto è quello sull'opzione mancante o inesistente.

Il caso dei riferimenti che non si risolvono più non è previsto, mentre i Requisiti dei Task chiedono che ogni riferimento si risolva quando il Task nasce: il codice segue le scelte fatte dal developer con le correzioni precedenti, ma il Modello non le registra.

## Fix options

### Record the container and the refusal in the Model

Il Modello e `rules#drift` dicono che un riferimento sparito diventa il suo contenitore più vicino nel Task di correzione e che, senza alcun elemento del Modello rimasto, la correzione è rifiutata. Il codice resta com'è ed è quello che il developer ha già scelto; costa solo l'approvazione della Proposal allegata.

### Keep the Drift's own references on the fix Task

Il codice torna alla lettera del Modello: il Task di correzione tiene i riferimenti del Drift così come sono, anche quelli spariti, e la correzione non è mai rifiutata. Costa un Task con riferimenti che non si risolvono, contro la regola dei Task, e annulla le scelte fatte con le correzioni precedenti.

## Where in the code

src/core/work.ts (`liveRefs` sceglie i contenitori, `fixCodeRefusal` e `fixCode` rifiutano la correzione); src/core/proposals.ts (`driftListProblems` e `unfixableDrifts` riusano lo stesso rifiuto per le risoluzioni)
