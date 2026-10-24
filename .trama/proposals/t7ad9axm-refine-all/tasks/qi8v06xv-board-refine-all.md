---
technical: false
refs:
  - panel/Board
  - panel/Closed/developer.SHOW_BOARD
  - panel/Closed/developer.OPEN_GHOST_DETAILS
  - panel/Open/developer.OPEN_GHOST_DETAILS
  - panel/Open/developer.SHOW_BOARD
  - panel/Settings/developer.CONFIRM_SETUP
  - panel/Settings/developer.CANCEL_SETUP
  - panel/Get Started/developer.INITIALIZE_PROJECT
  - panel/Get Started/workspace.MODEL_CHANGED
  - developer.RAFFINA_TUTTE
  - developer.ANNULLA_RAFFINA_TUTTE
  - requirements/ui#panel/Board
  - requirements/ui#General
  - requirements/ui#panel
  - requirements/ui#raffinamento
  - requirements/ui#developer.RAFFINA_TUTTE
  - requirements/ui#developer.UNIFY_DRIFTS
  - requirements/tech#developer.UNIFY_DRIFTS
---
# Refine All sulla Board

Lato webview di `Refine All`. La logica dell'host e il calcolo del quadro sono in un altro Task: qui il webview consuma soltanto i campi del quadro `refinement.running` (elenco di identità in raffinamento, in ordine di partenza), `refinement.queued` (`[{ proposal, waiting: "approval" | "chain" | "slot", on? }]`) e `refinement.refineAll` (`{ mode: "refine" | "cancel", count, blockers, since }`), senza ricalcolare regole.

Le transizioni `panel/Closed`, `panel/Open`, `panel/Settings` e `panel/Get Started` elencate nei riferimenti portano solo nello stato Board e non richiedono cambi.

## Menu di `+ Add Work Item`
- La freccetta (`ChevronUp`, sempre abilitata, con il suo tooltip) apre un `DropdownMenu` `side="top"` con due voci senza icona e senza tooltip, in quest'ordine: `Unify Drifts` (come oggi, nome accessibile `Unify Drifts`, descrizione accessibile `Merge every open Drift into one Drift to resolve`) e la seconda voce nuova. Il menu non ripete `+ Add Work Item`. Esc, clic fuori o nuovo clic sulla freccetta chiudono senza fare nulla, con il focus sulla freccetta; scegliere una voce abilitata chiude il menu.
- Con `mode` `refine`: etichetta e nome accessibile `Refine All (<count>)`, solo `Refine All` quando `count` è 0; descrizione accessibile `Refine every stale design Proposal on the current Model, then approve it`. La voce resta sempre nel menu: con `blockers` non vuoto è disabilitata (anche per le tecnologie assistive) e mostra i motivi sotto l'etichetta in testo secondario piccolo, uno per riga, che sono anche la descrizione accessibile, come per `Unify Drifts`: `Turn on Auto-update Stale Proposals in Settings`, `No Proposal to refine`. Sceglierla abilitata manda `{ type: "refineAll" }` senza campi, conferme o caselle; i terminali `Refine <numero breve>` non prendono il focus.
- Con `mode` `cancel`: stessa voce, stesso posto, etichetta e nome accessibile `Cancel Refine All`, descrizione accessibile `Take every waiting Proposal out of the refining queue`. Finché non sono passati 2 secondi da `since` è disabilitata senza motivo scritto; si abilita da sola con un timer avviato dal quadro, anche a menu aperto e senza aspettare un altro quadro; il timer si cancella quando il componente si smonta o il quadro cambia `since`. Sceglierla manda `{ type: "cancelRefineAll" }`, senza conferme; al quadro seguente le schede in attesa tornano `to refine` e la voce torna `Refine All (<n>)`.
- I messaggi `refineAll` e `cancelRefineAll` sono tipi nuovi in `extension/src/protocol.ts` (la validazione nell'host appartiene all'altro Task, ma i tipi devono esistere).

## Schede in Backlog
- Più schede possono essere `refining` insieme: ognuna in `refinement.running` ha il badge `refining` (tooltip e nome accessibile `The agent is refining this Proposal on the current Model`), il bordo blu-ciano animato del Task preso (fermo con la riduzione del movimento), la riga di fase `Refining` / `Waiting for your answers` e l'ultima nota dell'agente; `Approve`, `Reject` e la freccetta disabilitati con `The agent is refining this Proposal`. Nessuna logica deve più supporre un solo raffinamento al lavoro.
- Il badge `queued` ha come tooltip e nome accessibile il motivo dato da `queued[].waiting`/`on`, scritto con il numero breve della Proposal `on`: `approval` → `Waiting for <numero breve> to be approved first`; `chain` → `Waiting for <numero breve> to be refined first`; `slot` → `Waiting for a free refining slot`. `Approve` resta disabilitato con `Already queued for refining` e c'è `Cancel` come oggi.
- Il resto delle schede `to refine`, `waiting for the run` e le Draft a metà raffinamento restano come in `requirements/ui#raffinamento`.
- Tutti i testi sono in inglese e non seguono `trama.language`. Il Backlog non ha pulsanti che approvano più Proposal insieme salvo `Refine All`.

## Test
Un test del webview prova: la freccetta apre il menu con `Unify Drifts` e `Refine All` in quest'ordine; i motivi della voce disabilitata; l'etichetta senza numero con `count` 0; `Cancel Refine All` disabilitata nei primi 2 secondi da `since` e poi abilitata; il tooltip di `queued` per i tre motivi; due schede `refining` insieme. `extension/README.md` e `CHANGELOG.md` li aggiorna il Task dei raffinamenti paralleli.
