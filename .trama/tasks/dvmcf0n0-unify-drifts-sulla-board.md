---
column: done
technical: false
refs:
  - panel/Board
  - panel/Open/developer.SHOW_BOARD
  - requirements/ui#developer.OPEN_QUICK_TASK
  - requirements/ui#developer.UNIFY_DRIFTS
  - requirements/ui#drift-resolution/Unifying
  - requirements/ui#agent.UNIFY_DRIFTS
  - requirements/ui#drift/Unified
  - requirements/tech#developer.OPEN_QUICK_TASK
drift: null
proposal: l8md4lsg
agent: false
created: 2026-10-22T07:37:53.534Z
finished: 2026-10-22T07:50:20.114Z
---
# Unify Drifts sulla Board

Quando questo Task è fatto, la Board offre Unify Drifts e mostra il lavoro di unificazione e i Drift unificati. Il lancio dall'host è il Task «Lancio di Unify Drifts», che porta nella Snapshot `unify.blockers`, i Drift raccolti dal lavoro `unify` e l'annuncio; i campi `unifies`, `unifiedInto`, `origin` e `previous` come liste sono il Task «Drift unificato nel nucleo».

Che cosa deve valere:

- Il menu della freccetta di `+ Add Work Item` ha due voci, senza icona, in quest'ordine: `Unify Drifts` (tooltip `Merge every open Drift into one Drift to resolve`, nome accessibile `Unify Drifts`) e `Add Quick Task`. La freccetta e `Add Quick Task` restano sempre abilitate.
- Il componente condiviso dei pulsanti divisi (`extension/src/webview/split-button.tsx`) ammette voci disabilitate: `SplitItem` ha `disabled?` e `reason?`; una voce disabilitata è un `DropdownMenuItem` `disabled`, con `aria-disabled`, il motivo come tooltip e come `aria-description`, non chiude il menu e non chiama `onSelect`. Le altre voci e modalità non cambiano.
- `Unify Drifts` è disabilitata quando la Snapshot porta motivi in `unify.blockers` (`Drifts are being resolved`, `A run is in progress`, `Proposal <id> resolving Drifts awaits a decision`, `Unify needs at least two open Drifts`, in quest'ordine), che il tooltip e la descrizione accessibile danno tutti. Il webview non calcola regole da sé. Abilitata, la voce chiude il menu e manda `{ type: "launch", action: { kind: "unify-drifts" } }`, senza campi né conferme.
- In `System Activities` il ghost del lavoro ha il tipo `Unify`, il titolo `Unifying <N> Drifts` e la riga di fase di ogni ghost (`Preparing`, `Writing`, `Waiting for your answers`); nome accessibile `Agent unifying Drifts: <title>, <phase>`.
- Ogni scheda rossa raccolta dal lavoro ha il badge testuale `Unifying`, con tooltip e nome accessibile `An agent is unifying this Drift`, finché l'agente lavora. In quel tempo `Resolve` di ogni Drift è disabilitato con `Drifts are being resolved`, preceduto sulle schede raccolte da `An agent is unifying this Drift`; `Dismiss Drift` e la sua freccetta con `An agent is resolving Drifts`, sulla Board e nei dettagli del Diagramma; `Run all` e ogni `Run` con `Drifts are being resolved`.
- La scheda rossa di un Drift unificato ha il badge `unified` (prima di `recurring`), anche nelle righe di una risoluzione e nei dettagli del Diagramma, con tooltip e nome accessibile `Unifies <N> Drifts`. I suoi dettagli, con `Show details` sulla Board e nel Diagramma, hanno dopo i due lati la sezione `Unifies`, una riga per Drift unito (identità e titolo) che porta ai suoi dettagli nel Diagramma. Con più precedenti il badge `recurring` ha il tooltip `Recurring: follows <N> Drifts` e i dettagli del Diagramma elencano ogni precedente con identità, titolo e decisione.
- Un Drift unito sparisce dalla Board; nei dettagli del Diagramma mostra lo stato `Unified` e la riga `Unified into <Drift> – <titolo>` (numero breve se il Drift unificato è aperto, altrimenti identità), che porta ai dettagli di quel Drift, senza Fix options da scegliere né pulsanti.
- Con la chat di Cursor fuori da Cursor nessuna scheda è segnata. Tutti i testi sono in inglese e non seguono `trama.language`.
- Test del webview: la freccetta apre il menu con `Unify Drifts` e `Add Quick Task` in quest'ordine; `Add Quick Task` manda `openQuickTask`; una voce disabilitata mostra il motivo e non manda nulla; `Unify Drifts` abilitata manda il lancio.
