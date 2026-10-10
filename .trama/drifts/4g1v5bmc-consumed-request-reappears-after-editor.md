---
status: resolved
resolution: fix-code
refs:
  - design-request/Consumed
  - design-request/Abandoned
  - requirements/rules#design-request
proposal: null
task: nxbplkgj
origin: null
option: 1
note: null
resolvedBy: i0e2coiq
created: 2026-10-10T08:44:00.983Z
---
# Consumed request reappears after editor restart

## What happens

Una richiesta scritta già consumata da una Proposal, o cancellata senza essere inviata, può tornare inviabile dopo un riavvio dell'editor. Se la sua scheda è rimasta aperta con modifiche non salvate, l'editor la ripristina; il pulsante Send to agent compare di nuovo, e inviandola Trama riscrive il file e manda all'agente un'istruzione che nomina la richiesta. Dentro la stessa sessione questo non succede, perché la richiesta resta segnata come finita.

## What should happen

Una richiesta consumata o abbandonata non esiste più e non viene mai inviata di nuovo: dopo la Proposal che l'ha consumata, o la cancellazione, il file non torna e nessun invio parte, anche dopo un riavvio dell'editor. Solo una richiesta nuova può partire.

## Fix options

### Ricordare le richieste finite tra un riavvio e l'altro

Le richieste consumate o abbandonate restano nell'elenco salvato nello stato dell'area di lavoro, fino a quando la loro scheda non è chiusa. All'apertura, una scheda ripristinata di una richiesta finita viene chiusa senza salvare e senza inviare. Costa una voce in più nell'elenco da togliere a tempo debito e una regola in più da mantenere.

### Rifiutare l'invio se il file non esiste più

Send to agent e il salvataggio di una scheda la cui richiesta non esiste più non riscrivono il file e non inviano nulla, e la scheda resta con il suo testo. Non serve nessun elenco nuovo. Il developer che vuole il testo deve copiarlo da sé, perché la richiesta non parte più dalla scheda ripristinata.

### Chiudere senza salvare le schede di richieste sparite all'avvio

All'avvio dell'estensione, le schede di richieste il cui file non esiste più vengono chiuse scartando le modifiche non salvate. È il controllo più semplice, ma il testo scritto e non salvato va perso senza avviso.

## Where in the code

extension/src/host/design-requests.ts: insieme finished, forgetMissing, send e deliver
