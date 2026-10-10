---
status: resolved
resolution: fix-code
refs:
  - requirements/ui#panel
proposal: null
task: nyt89roc
origin: null
option: 1
note: null
resolvedBy: 5mztm9sl
created: 2026-10-10T12:54:19.665Z
---
# Il pannello mostra ancora gli interruttori Hold scan

## What happens

Le barre di **Board, Diagramma e Requisiti** mostrano ancora lo switch **Hold scan**. Il developer può attivarlo e disattivarlo dal pannello; gli aggiornamenti mostrano il suo stato e il numero di Proposal tenute in attesa. Il pannello continua quindi a offrire un controllo che il design approvato ha eliminato.

## What should happen

Non deve esistere **nessuno switch Hold scan in nessuna barra** del pannello. Board e Diagramma conservano i loro pulsanti per chiedere la scansione, senza offrire al developer un interruttore per sospenderla. Anche la barra dei Requisiti deve essere priva del controllo.

## Fix options

### Eliminare il controllo dalle tre barre

Rimuovere lo switch da Board, Diagramma e Requisiti e smettere di inviare dal pannello richieste per accenderlo o spegnerlo. Conservare gli altri pulsanti e il loro funzionamento. Il developer non può più sospendere le scansioni dal pannello; il costo è aggiornare insieme le tre barre e il loro scambio di aggiornamenti con l’editor.

### Ricostruire le barre dalle sole azioni previste

Ricostruire le tre barre mantenendo soltanto le azioni ancora previste dal Modello e dai Requisiti, senza il controllo Hold scan né il suo aggiornamento. Il risultato per il developer è lo stesso, ma si riallinea esplicitamente ogni barra alle azioni consentite. Il costo è una revisione più ampia delle barre rispetto alla sola rimozione del controllo.

## Where in the code

extension/src/webview/board/index.ts: mountBoard e render; extension/src/webview/diagram/index.ts: mountDiagram e update; extension/src/webview/requirements/index.ts: mountRequirements e render; extension/src/webview/scan-hold-switch.ts: createScanHoldSwitch.
