---
description: "Usa quando costruisci o cambi la voce Unify Drifts del menu di + Add Work Item, il suo ghost, i badge `Unifying` e `unified` e ciò che il pannello mostra dei Drift uniti."
---
# Unify Drifts interface

## developer.UNIFY_DRIFTS
- `Unify Drifts` è la sola voce del menu della freccetta di `+ Add Work Item` (`ui#panel/Board`), senza icona e senza tooltip, con nome accessibile `Unify Drifts` e descrizione accessibile `Merge every open Drift into one Drift to resolve`.
- Quando non si può usare resta nel menu, appare disabilitata ed è segnata come disabilitata per le tecnologie assistive; i motivi stanno sotto l'etichetta della voce, in testo secondario e piccolo, uno per riga, e sono anche la descrizione accessibile, in quest'ordine quando ne valgono più d'uno: `Drifts are being resolved` (un agente di risoluzione o di unificazione lavora, o il developer risponde a una domanda pronta), `A run is in progress` (un Run lanciato da Trama non è finito), `Proposal <id> resolving Drifts awaits a decision` (con lo stesso testo e la stessa regola di `Resolve`, `ui#drift`), `Unify needs at least two open Drifts` (meno di due Drift aperti fuori da ogni risoluzione in scrittura o aperta). Nessuna voce di un menu dei pulsanti divisi ha un tooltip. Una voce disabilitata non chiude il menu e non fa nulla.
- Scegliere la voce abilitata non mostra campi, caselle né conferme: chiude il menu e lancia subito l'agente. Il terminale `Unify`, con omp, non prende il focus, come ogni terminale dell'agente salvo quello di Ask more.
- Tutti questi testi sono in inglese e non seguono `trama.language`.

## drift-resolution/Unifying
- `Backlog` mostra in fondo il ghost del Drift unificato che Trama annuncia al lancio, con il tipo `Unify` e il titolo `Unifying <N> Drifts`, dove N è il numero dei Drift raccolti, e la riga di fase di ogni ghost (`Preparing`, `Writing` mentre l'agente scrive la Proposal da allegare, `Waiting for your answers` mentre il round di domande è aperto). Tiene il titolo finché il Drift unificato non è registrato. Il nome accessibile è `Agent unifying Drifts: <title>, <phase>`.
- La scheda rossa di ogni Drift raccolto porta un badge testuale `Unifying` accanto agli altri badge, con tooltip e nome accessibile `An agent is unifying this Drift`. Il badge sparisce quando l'agente finisce o quando il Drift è unito e la sua scheda sparisce.
- Mentre l'agente lavora, `Resolve` di ogni Drift è disabilitato con il motivo `Drifts are being resolved`, preceduto, sulle schede raccolte, da `An agent is unifying this Drift`; `Dismiss Drift` e la sua freccetta sono disabilitati con il motivo `An agent is resolving Drifts`, sulla Board e nei dettagli del Diagramma; `Run all` e il `Run` di ogni Task sono disabilitati con il motivo `Drifts are being resolved`, nell'ordine dei motivi di `ui#panel/Board`.

## agent.UNIFY_DRIFTS
- La scheda rossa di un Drift unificato porta un badge testuale `unified` accanto agli altri badge (prima di `recurring`, se c'è), nella scheda della Board, nelle righe di una risoluzione che lo elenca e nei dettagli del Diagramma, con tooltip e nome accessibile `Unifies <N> Drifts`. Il badge non apre nulla da solo e non sposta il focus.
- I dettagli del Drift unificato, aperti con `Show details` sulla Board e nel Diagramma, hanno dopo i due lati una sezione `Unifies` con una riga per ogni Drift unito, nell'ordine di `unifies`: identità permanente e titolo, che porta ai dettagli di quel Drift nel Diagramma.
- Un Drift unificato con più precedenti ha il badge `recurring` con il tooltip `Recurring: follows <N> Drifts`; i dettagli del Diagramma elencano ogni precedente con identità, titolo e decisione, nell'ordine di `previous`. Con un solo precedente il badge resta quello di `ui#drift`.

## drift/Unified
- Un Drift unito non ha scheda: i dettagli del Diagramma mostrano lo stato `Unified` e una riga `Unified into <Drift> – <titolo>`, con il numero breve del Drift unificato se è aperto, altrimenti la sua identità permanente, che porta ai dettagli di quel Drift. Non mostrano Fix options da scegliere né pulsanti.
