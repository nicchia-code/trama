---
column: done
technical: false
refs:
  - agent-terminal/Agent idle/developer.ASK_AGENT
  - requirements/rules#agent-terminal
drift: bqqdz4cs
proposal: null
agent: false
created: 2026-10-10T10:36:32.872Z
finished: 2026-10-10T10:45:41.148Z
---
# Fix code to match the Model: A WezTerm window opened while WezTerm was not running is never reused

## What happens

Con WezTerm come terminale rilevato, se WezTerm **non è già in esecuzione** Trama lo avvia da zero e non ricorda come raggiungere la finestra aperta.

Quando quella corsa finisce e arriva un'istruzione con lo stesso nome, Trama apre **una finestra nuova senza avvisi e senza tentare il riuso**, anche se la finestra precedente è libera, il terminale è WezTerm e non c'è un comando di terminale personalizzato. Si riusano solo le finestre aperte mentre WezTerm era già attivo, quindi il developer si ritrova con una finestra in più ogni volta che parte con WezTerm chiuso.

## What should happen

Una finestra esterna libera si riusa quando la sua corsa è finita, il terminale rilevato è Terminal.app, kitty o **WezTerm**, il comando di terminale personalizzato è vuoto e la nuova istruzione ha lo stesso nome.

Il riuso si tenta con lo scripting del terminale; solo se lo scripting fallisce si apre una finestra nuova, e il developer è avvisato. Una finestra nuova senza avvisi è prevista solo quando una di quelle condizioni manca in partenza, non per come è stato avviato WezTerm.

## Chosen option

**Ricordare anche la finestra di un WezTerm appena avviato**

Quando Trama deve avviare WezTerm da zero, dopo l'apertura recupera il riquadro della finestra nuova (chiedendolo al WezTerm ora in esecuzione, o facendoselo comunicare dalla riga che gira nella finestra) e lo ricorda come per le altre. Quella finestra diventa riusabile come le altre. Costo: un passo di scripting in più e il caso in cui il riquadro non si trova, che la lascia non riusabile.

## Where in the code

extension/src/host/external-open.ts (`openWindow`, ramo WezTerm con il ripiego su `wezterm start` che non restituisce la finestra); extension/src/host/agent.ts (`rememberExternalWindow`)
