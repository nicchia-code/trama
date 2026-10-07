---
column: done
technical: false
refs:
  - proposal/Draft/drift.CODE_FIX_CHOSEN
  - proposal/Open/drift.CODE_FIX_CHOSEN
  - proposal/Rejected
  - drift/Open/developer.FIX_DRIFT_CODE
  - drift.CODE_FIX_CHOSEN
  - requirements/rules#drift
  - requirements/tech#drift
drift: null
proposal: 37d8rz9w
agent: false
created: 2026-10-07T17:03:22.775Z
finished: 2026-10-07T17:12:56.618Z
---
# Set aside the attached Proposal when a Drift's code is fixed

Quando il developer tiene «What should happen» su un Drift con una Proposal allegata, nello stesso passo la Proposal viene messa da parte; oggi resta com'era.

A lavoro finito:
- una Proposal allegata **aperta** diventa Rejected con il feedback «Drift <id> resolved by fixing the code» (il Drift con la sua identità permanente);
- una Proposal allegata ancora **Draft** diventa Discarded, senza feedback;
- una Proposal allegata già approvata, rifiutata o scartata resta com'è;
- le Proposal che richiedono quella messa da parte restano bloccate, dicendo che è stata rifiutata o scartata;
- se la correzione del codice è rifiutata (per esempio manca l'opzione), né il Drift né la Proposal cambiano;
- `trama drift resolve --fix-code` dice nella sua uscita che la Proposal allegata è stata rifiutata o scartata; lo stesso vale quando la decisione arriva dal pannello.
