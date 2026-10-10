---
column: done
technical: false
refs:
  - proposal/Draft/developer.DISCARD_PROPOSAL
  - requirements/rules#proposal
drift: 9lemwnhf
proposal: null
agent: false
created: 2026-10-09T21:50:06.512Z
finished: 2026-10-09T21:55:35.358Z
---
# Fix code to match the Model: A developer can discard a Draft attached to an open Drift from the command line

## What happens

Il developer può scartare da riga di comando una bozza di Proposal che è allegata a un Drift aperto. Il Drift resta aperto e continua a indicare la bozza scartata: non si può più accettare né chiudere senza correggere il codice, e la Board non mostra più la bozza.

## What should happen

Il Modello dice che una Proposal allegata a un Drift aperto si decide solo attraverso il Drift: il developer non la decide da sola, e scartare non cambia il Drift a cui è allegata. Approvare e rifiutare direttamente sono già rifiutati per una Proposal allegata; scartare no.

## Chosen option

**Rifiutare anche lo scarto diretto**

Lo scarto di una bozza allegata a un Drift aperto viene rifiutato, come l'approvazione e il rifiuto, con un messaggio che rimanda al Drift. La bozza si mette da parte correggendo il codice del Drift, che resta com'è. Costo: per scartare una bozza serve passare dal Drift, e il Drift si chiude solo correggendo il codice o accettando la bozza.

## Where in the code

Comando proposal discard in src/cli/commands.ts (nessun controllo di allegato, a differenza di approve e reject); discardProposal in src/core/proposals.ts; controllo requireNotAttached in src/core/work.ts; Board: blocco della bozza allegata in src/core/snapshot.ts
