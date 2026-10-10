---
status: resolved
resolution: fix-code
refs:
  - agent-terminal/Agent idle/developer.ASK_AGENT
  - requirements/rules#agent-terminal
proposal: null
task: yfzoz76v
origin: null
option: 1
note: null
resolvedBy: vgoluaem
created: 2026-10-10T10:22:22.100Z
---
# A WezTerm window opened while WezTerm was not running is never reused

## What happens

Con WezTerm come terminale rilevato, se WezTerm **non è già in esecuzione** Trama lo avvia da zero e non ricorda come raggiungere la finestra aperta.

Quando quella corsa finisce e arriva un'istruzione con lo stesso nome, Trama apre **una finestra nuova senza avvisi e senza tentare il riuso**, anche se la finestra precedente è libera, il terminale è WezTerm e non c'è un comando di terminale personalizzato. Si riusano solo le finestre aperte mentre WezTerm era già attivo, quindi il developer si ritrova con una finestra in più ogni volta che parte con WezTerm chiuso.

## What should happen

Una finestra esterna libera si riusa quando la sua corsa è finita, il terminale rilevato è Terminal.app, kitty o **WezTerm**, il comando di terminale personalizzato è vuoto e la nuova istruzione ha lo stesso nome.

Il riuso si tenta con lo scripting del terminale; solo se lo scripting fallisce si apre una finestra nuova, e il developer è avvisato. Una finestra nuova senza avvisi è prevista solo quando una di quelle condizioni manca in partenza, non per come è stato avviato WezTerm.

## Fix options

### Ricordare anche la finestra di un WezTerm appena avviato

Quando Trama deve avviare WezTerm da zero, dopo l'apertura recupera il riquadro della finestra nuova (chiedendolo al WezTerm ora in esecuzione, o facendoselo comunicare dalla riga che gira nella finestra) e lo ricorda come per le altre. Quella finestra diventa riusabile come le altre. Costo: un passo di scripting in più e il caso in cui il riquadro non si trova, che la lascia non riusabile.

### Avviare WezTerm in modo che la finestra sia sempre raggiungibile

Quando WezTerm non è attivo, Trama lo avvia prima senza finestre e poi apre la finestra dell'agente con lo stesso comando usato quando WezTerm è già attivo, che restituisce subito il riquadro. Ogni finestra è riusabile allo stesso modo. Costo: cambia come nasce la prima finestra di WezTerm e dipende da funzioni di WezTerm da verificare sulle versioni che il developer usa.

### Dichiarare nel Modello che quella finestra non si riusa

Modello e Requisiti dicono che una finestra aperta avviando WezTerm da zero non si riusa e che l'istruzione successiva apre una finestra nuova senza avvisi. Nessun cambio al codice; il developer continua a trovare una finestra in più dopo ogni avvio di WezTerm, ma il comportamento è quello descritto.

## Where in the code

extension/src/host/external-open.ts (`openWindow`, ramo WezTerm con il ripiego su `wezterm start` che non restituisce la finestra); extension/src/host/agent.ts (`rememberExternalWindow`)
