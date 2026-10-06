---
status: resolved
resolution: fix-code
refs:
  - design-request/Writing/developer.ASK_AGENT
  - design-request/Writing/developer.CLOSE_REQUEST
  - requirements/rules#design-request
  - requirements/tech#design-request
proposal: null
task: 63s66uqu
origin: null
option: 1
note: null
created: 2026-10-06T18:49:57.193Z
---
# Non segnare inviate le richieste rimaste negli appunti

## What happens

Quando il launcher della chat ripiega sugli appunti, Trama considera la richiesta **già inviata** e chiude la sua scheda. Succede anche quando Cursor apre soltanto una chat che aspetta conferma e Invio. L’agente non ha ancora ricevuto l’istruzione: se il developer non incolla o non conferma, la richiesta rimane su disco ma non offre più Send to agent e non può ripartire dalla stessa richiesta. Lo scenario isolato con chat indisponibile conferma che il testo va soltanto negli appunti mentre la scheda si chiude e la richiesta entra nell’elenco persistente degli invii.

## What should happen

Una richiesta passa da Writing a Sent soltanto quando **l’istruzione parte davvero**. Se il launcher non l’ha consegnata all’agente, la richiesta deve restare mai inviata. Premendo Send to agent la scheda rimane aperta; chiudendola volontariamente resta invece chiusa, con il file su disco recuperabile dall’esploratore. La copia negli appunti e una chat ancora in attesa di conferma non dimostrano che l’agente abbia ricevuto la richiesta.

## Fix options

### Mantenere Writing per le consegne manuali

Segnare inviata la richiesta soltanto quando il terminale riceve l’istruzione o la chat la invia automaticamente. Se il launcher prepara gli appunti o una chat da confermare, lasciare la richiesta mai inviata e conservare la scheda dopo Send to agent. È la soluzione più piccola: il developer può scegliere un launcher che invia davvero, senza perdere la possibilità di riprovare.

### Richiedere un launcher con invio effettivo

Per le richieste scritte, quando la chat non può inviare automaticamente, proporre al developer di avviare la stessa istruzione nel terminale. Solo l’avvio riuscito segna la richiesta come inviata e chiude la scheda; annullare mantiene Writing. Conserva una consegna esplicita anche senza la chat automatica, ma aggiunge una scelta prima dell’avvio e deve rispettare la preferenza del developer.

## Where in the code

extension/src/host/design-requests.ts: DesignRequests.deliver e send; extension/src/host/agent.ts: launched e openChat; extension/src/host/cursor.ts: openCursorChat e toClipboard; test/host-design-requests.test.ts: the chat's fallbacks count as sent
