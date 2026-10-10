---
column: done
technical: true
refs:
  - requirements/rules#design-request
drift: rt8al47z
proposal: null
agent: false
created: 2026-10-10T14:15:26.887Z
finished: 2026-10-10T16:45:11.272Z
---
# Fix code to match the Requirements: Il titolo del fantasma può provenire da un esempio di codice dentro un elenco

## What happens

Quando una richiesta contiene un elenco il cui punto comincia con un blocco di codice Markdown recintato, un’intestazione scritta dentro quell’esempio può diventare il **titolo del fantasma** sul Board. Per esempio, se l’esempio contiene l’intestazione «Titolo dell’esempio» e dopo l’elenco la richiesta ha l’intestazione «Richiesta reale», viene annunciato «Titolo dell’esempio». Il blocco aperto sulla stessa riga del punto elenco non viene riconosciuto come codice. Il file della richiesta e il testo consegnato restano corretti; è il titolo mostrato a essere sbagliato.

## What should happen

Il titolo della richiesta è il primo titolo di primo livello **fuori dai blocchi di codice**, senza i marcatori e gli spazi attorno. Un esempio di codice resta escluso anche quando appartiene a un elenco: nel caso descritto il fantasma deve chiamarsi «Richiesta reale». Solo quando non esiste un titolo idoneo si usa la prima riga non vuota. La regola vale sia per Send to agent sia per l’invio ottenuto chiudendo la scheda.

## Chosen option

**Escludere anche gli esempi di codice annidati**

Il fantasma continua a usare il primo titolo di primo livello della richiesta, ma non prende mai intestazioni dagli esempi di codice, inclusi quelli contenuti negli elenchi e nelle citazioni. Il developer mantiene il titolo descrittivo senza limitare il Markdown che può scrivere. Il costo è riconoscere correttamente il contesto dei blocchi, con casi di controllo per invio esplicito e chiusura della scheda.

## Where in the code

src/core/design-requests.ts: requestTitle riconosce l’apertura di un recinto soltanto all’inizio della riga, con al massimo tre spazi, e non riconosce un’apertura preceduta dal marcatore del punto elenco; un’intestazione del codice con due spazi viene poi letta come titolo. extension/src/host/design-requests.ts: deliver usa quel titolo per entrambi i gesti di invio.
