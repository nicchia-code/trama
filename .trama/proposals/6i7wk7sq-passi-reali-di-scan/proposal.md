---
status: rejected
base:
  website/tour.md: 6e83c426378a758cd4eb446a4cebefdbc15a6118c1f33cfdc14626912fb3994f
delete: []
created: 2026-10-26T21:23:35.433Z
label: "Tour: Scan and Drifts"
---
# Passi reali di Scan

Il capitolo Scan and Drifts del tour descrive i passi in un ordine che il prodotto non segue: nel prodotto il Drift lascia la Board quando la risoluzione viene approvata, prima che il codice sia corretto, quindi nessuna correzione del codice rispetta quell'ordine. Il tour implementato segue il flusso reale (Scan, Board, lettura del Drift, Resolve, scelta della Fix option, approvazione, esecuzione del Task di correzione, Task in Done).

La Proposal modifica solo la descrizione dei passi dello State Scan and Drifts in website/tour.md, senza toccare Transition, Events o altri State.

## Already present

- `tour/Scan and Drifts` — `site/src/demo/tour.ts` (chapter "Scan and Drifts")
- `tour/Off/visitor.START_CHAPTER` — `site/src/demo/tour.ts` (chapters list)
- `tour/Guiding/visitor.START_CHAPTER` — `site/src/demo/tour.ts` (chapters list)
- `tour/Running Tasks/visitor.FOLLOW_STEP` — `site/src/demo/tour.ts` (last step of "Running Tasks" leads to the next chapter)

## Feedback

Drift w12wq4k2 resolved by Proposal vwtb46lx
