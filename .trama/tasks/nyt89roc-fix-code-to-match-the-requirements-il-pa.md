---
column: done
technical: true
refs:
  - requirements/ui#panel
drift: g6v367uk
proposal: null
agent: false
created: 2026-10-10T14:15:26.896Z
finished: 2026-10-10T15:55:59.711Z
---
# Fix code to match the Requirements: Il pannello mostra ancora gli interruttori Hold scan

## What happens

Le barre di **Board, Diagramma e Requisiti** mostrano ancora lo switch **Hold scan**. Il developer può attivarlo e disattivarlo dal pannello; gli aggiornamenti mostrano il suo stato e il numero di Proposal tenute in attesa. Il pannello continua quindi a offrire un controllo che il design approvato ha eliminato.

## What should happen

Non deve esistere **nessuno switch Hold scan in nessuna barra** del pannello. Board e Diagramma conservano i loro pulsanti per chiedere la scansione, senza offrire al developer un interruttore per sospenderla. Anche la barra dei Requisiti deve essere priva del controllo.

## Chosen option

**Eliminare il controllo dalle tre barre**

Rimuovere lo switch da Board, Diagramma e Requisiti e smettere di inviare dal pannello richieste per accenderlo o spegnerlo. Conservare gli altri pulsanti e il loro funzionamento. Il developer non può più sospendere le scansioni dal pannello; il costo è aggiornare insieme le tre barre e il loro scambio di aggiornamenti con l’editor.

## Where in the code

extension/src/webview/board/index.ts: mountBoard e render; extension/src/webview/diagram/index.ts: mountDiagram e update; extension/src/webview/requirements/index.ts: mountRequirements e render; extension/src/webview/scan-hold-switch.ts: createScanHoldSwitch.
