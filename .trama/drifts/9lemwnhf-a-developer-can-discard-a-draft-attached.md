---
status: resolved
resolution: fix-code
refs:
  - proposal/Draft/developer.DISCARD_PROPOSAL
  - requirements/rules#proposal
proposal: null
task: u1uy524q
origin: null
option: 1
note: null
resolvedBy: b4duwb4w
created: 2026-10-09T21:30:03.665Z
---
# A developer can discard a Draft attached to an open Drift from the command line

## What happens

Il developer può scartare da riga di comando una bozza di Proposal che è allegata a un Drift aperto. Il Drift resta aperto e continua a indicare la bozza scartata: non si può più accettare né chiudere senza correggere il codice, e la Board non mostra più la bozza.

## What should happen

Il Modello dice che una Proposal allegata a un Drift aperto si decide solo attraverso il Drift: il developer non la decide da sola, e scartare non cambia il Drift a cui è allegata. Approvare e rifiutare direttamente sono già rifiutati per una Proposal allegata; scartare no.

## Fix options

### Rifiutare anche lo scarto diretto

Lo scarto di una bozza allegata a un Drift aperto viene rifiutato, come l'approvazione e il rifiuto, con un messaggio che rimanda al Drift. La bozza si mette da parte correggendo il codice del Drift, che resta com'è. Costo: per scartare una bozza serve passare dal Drift, e il Drift si chiude solo correggendo il codice o accettando la bozza.

### Lasciare lo scarto e far sciogliere il legame

Lo scarto di una bozza allegata sgancia il Drift, che torna senza Proposal e può essere chiuso come gli altri. Costo: il Drift non è più deciso insieme alla bozza, e va cambiata la regola che dice che scartare non cambia il Drift a cui è allegata.

### Lasciare lo scarto e tenere il legame morto

Lo scarto resta consentito e il Drift tiene la bozza scartata, la cui unica via d'uscita è correggere il codice. Costo: il Drift si blocca senza una scelta chiara, la Board non lo spiega, e la regola sul legame del Modello va aggiornata.

## Where in the code

Comando proposal discard in src/cli/commands.ts (nessun controllo di allegato, a differenza di approve e reject); discardProposal in src/core/proposals.ts; controllo requireNotAttached in src/core/work.ts; Board: blocco della bozza allegata in src/core/snapshot.ts
