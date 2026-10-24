---
technical: true
refs:
  - requirements/ui#General
  - requirements/ui#developer.REWORK_PROPOSAL
  - requirements/ui#developer.REWORK_DRIFT
  - requirements/ui#developer.UNIFY_DRIFTS
  - requirements/tech#developer.UNIFY_DRIFTS
---
# Menu a tendina senza tooltip

Le voci dei menu dei pulsanti divisi non hanno più tooltip, perché affollavano la vista: tengono il loro testo come descrizione accessibile e mostrano i motivi di disabilitazione sotto l'etichetta. La freccetta di ogni pulsante diviso tiene il suo tooltip. Tutti gli altri tooltip del pannello restano come sono (`ui#General`); quelli del menu laterale li toglie il Task `Menu laterale senza tooltip`.

Quando è fatto:
- Nel componente condiviso `extension/src/webview/split-button.tsx:SplitButton` nessuna voce del menu (`DropdownMenuItem`) ha un `Tip`/`Tooltip` o un attributo `title`. La descrizione di una voce abilitata (oggi `SplitItem.tooltip`, da rinominare `description`, opzionale) va solo in `aria-description`. Il pulsante principale e la freccetta tengono i loro tooltip e nomi accessibili.
- Una voce disabilitata (`SplitItem.disabled`, `reason`) resta nel menu, è un `DropdownMenuItem` con `disabled` e `aria-disabled`, non chiude il menu e non chiama `onSelect`; mostra `reason` sotto l'etichetta in testo secondario e piccolo, un motivo per riga, e lo usa come `aria-description`.
- `Rework with feedback…` del menu di `Reject` (Proposal): senza icona e senza tooltip, descrizione accessibile `Reject it and have the agent redo it with your feedback`; il menu non ripete `Reject`.
- `Rework with feedback…` del menu di `Dismiss Drift` (scheda rossa in Backlog e dettagli del Drift nel Diagramma): senza icona e senza tooltip, descrizione accessibile `Have the agent resolve this Drift following your feedback`; la freccetta `ChevronDown` tiene tooltip e nome `More ways to handle <numero breve>`.
- `Unify Drifts`, sola voce del menu della freccetta di `+ Add Work Item`: senza icona e senza tooltip, nome accessibile `Unify Drifts`, descrizione accessibile `Merge every open Drift into one Drift to resolve`. Disabilitata, mostra sotto l'etichetta, in quest'ordine quando ne valgono più d'uno, `Drifts are being resolved`, `A run is in progress`, `Proposal <id> resolving Drifts awaits a decision`, `Unify needs at least two open Drifts`, che sono anche la sua descrizione accessibile.
- Tutti i chiamanti di `SplitButton` (Board e Diagramma) sono aggiornati, e i test del componente e della Board verificano l'assenza di tooltip sulle voci, la descrizione accessibile e la riga dei motivi sotto l'etichetta.
