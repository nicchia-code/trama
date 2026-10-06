---
status: resolved
resolution: fix-code
refs:
  - task/Taken by the agent/terminal.COMMAND_ENDED
proposal: null
task: hswja8sw
origin: null
option: 1
note: null
created: 2026-10-06T16:25:20.189Z
---
# I Task presi in una finestra esterna sostituita restano presi alla fine del suo comando

## What happens

Con il launcher **external-terminal**, se arriva una nuova istruzione mentre l'agente lavora ancora in una finestra esterna, Trama apre una finestra nuova e **smette di seguire la vecchia**. Quando il comando della vecchia finestra finisce, il suo marcatore di fine viene cancellato e non conta: i Task che quell'agente aveva preso **restano presi** (agent working) per sempre.

Il developer deve accorgersene e liberarli con `trama task take-back`, poi riportarli in To do a mano; intanto Run all To do e Run this design restano non disponibili. Il terminale integrato non ha questo limite: la fine del comando di un terminale vecchio libera ancora i suoi Task.

Il codice segue alla lettera `requirements/tech#agent-terminal` e `requirements/rules#agent-terminal` (il marcatore di una corsa non più seguita si cancella e non conta).

## What should happen

La Transition **Taken by the agent → To do** su `terminal.COMMAND_ENDED` dice che la fine del comando dell'agente **nel terminale che ha preso il Task** lo rilascia subito e lo riporta in To do, perché nessun agente ci lavora più; solo la fine di un altro terminale non rilascia nulla. La descrizione dell'Event dice che una finestra del launcher esterno riporta sempre la fine del suo comando.

Il Modello non prevede un terminale che ha preso dei Task e la cui fine non conta più: qui il Modello e i Requisiti dell'agent-terminal si contraddicono, e il developer deve scegliere quale vince.

## Fix options

### Rilasciare i Task della finestra sostituita al suo marcatore

Trama continua ad ascoltare il marcatore della finestra sostituita solo per ciò che appartiene a quel terminale: alla sua fine rilascia i Task che ha preso (e ritira i suoi annunci), senza toccare lo stato dell'agente né far nascere avvisi sulla fine. Rispetta il Modello del Task e allinea il launcher esterno al terminale integrato. Costa una precisazione del Requisito sul marcatore non più seguito, da fare con una Proposal.

### Tenere presi i Task fino al take-back

Il codice resta com'è: i Task presi in una finestra sostituita si liberano solo con `trama task take-back`. Va cambiato il Modello: la Transition su `terminal.COMMAND_ENDED` e la descrizione dell'Event devono dire che la fine di una finestra esterna non più seguita non rilascia nulla. Nessun lavoro sul codice, ma il developer deve accorgersi dei Task bloccati e Run all To do resta non disponibile finché non li riprende.

## Where in the code

extension/src/host/external-terminal.ts (`ExternalRuns.start`: la corsa spostata smette di essere seguita; il marcatore di una corsa non seguita viene scartato); extension/src/host/agent.ts (`watchExternalRuns`: solo il marcatore seguito chiama il rilascio dei Task)
