---
column: done
technical: false
refs:
  - design-request/Consumed
  - design-request/Abandoned
  - requirements/rules#design-request
drift: 4g1v5bmc
proposal: null
agent: false
created: 2026-10-10T09:02:18.943Z
finished: 2026-10-10T10:43:26.057Z
---
# Fix code to match the Model: Consumed request reappears after editor restart

## What happens

Una richiesta scritta già consumata da una Proposal, o cancellata senza essere inviata, può tornare inviabile dopo un riavvio dell'editor. Se la sua scheda è rimasta aperta con modifiche non salvate, l'editor la ripristina; il pulsante Send to agent compare di nuovo, e inviandola Trama riscrive il file e manda all'agente un'istruzione che nomina la richiesta. Dentro la stessa sessione questo non succede, perché la richiesta resta segnata come finita.

## What should happen

Una richiesta consumata o abbandonata non esiste più e non viene mai inviata di nuovo: dopo la Proposal che l'ha consumata, o la cancellazione, il file non torna e nessun invio parte, anche dopo un riavvio dell'editor. Solo una richiesta nuova può partire.

## Chosen option

**Ricordare le richieste finite tra un riavvio e l'altro**

Le richieste consumate o abbandonate restano nell'elenco salvato nello stato dell'area di lavoro, fino a quando la loro scheda non è chiusa. All'apertura, una scheda ripristinata di una richiesta finita viene chiusa senza salvare e senza inviare. Costa una voce in più nell'elenco da togliere a tempo debito e una regola in più da mantenere.

## Where in the code

extension/src/host/design-requests.ts: insieme finished, forgetMissing, send e deliver
