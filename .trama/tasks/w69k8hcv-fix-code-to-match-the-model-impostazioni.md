---
column: done
technical: false
refs:
  - panel/Settings
drift: dv33jk9u
proposal: null
agent: false
created: 2026-10-16T10:20:57.424Z
finished: 2026-10-16T10:35:29.305Z
---
# Fix code to match the Model: Impostazioni: la delega dei Drift è due caselle sotto «Auto Fix Drifts», non un menu in «Drift autopilot»

## What happens

La scheda Settings mette la delega dei Drift in un gruppo intitolato **Auto Fix Drifts**, con due caselle di spunta separate: una per i Drift non critici e una per quelli critici. La seconda è disabilitata finché la prima è spenta, e spegnere la prima spegne anche la seconda. Il developer non trova quindi i livelli di delega in un solo punto: deve leggere due caselle e capire da sé il loro effetto combinato.

## What should happen

Il Modello mette la delega nel gruppo **Drift autopilot**, come una sola scelta fra tre livelli: spenta; l'agente approva e corregge i Drift non critici; l'agente approva e corregge anche i critici. Alzare la delega chiede conferma con un avviso modale, e la scelta vale solo nelle impostazioni dell'utente. I Requisiti descrivono lo stesso controllo come un menu a tre valori, in ordine dal più basso al più alto.

## Chosen option

**Un solo menu nel gruppo Drift autopilot**

Il gruppo prende il titolo **Drift autopilot** e contiene un solo menu a tre scelte: spenta, sui non critici, su tutti. Il menu scrive le due impostazioni già salvate, quindi i valori dei developer restano come sono e la conferma modale è la stessa. Costo: la scheda traduce due valori in una scelta, con la regola che il critico vale solo se il non critico è acceso; le spiegazioni dei tre livelli vanno scritte sul menu.

## Where in the code

extension/src/host/settings-schema.ts, costante SETTING_GROUPS: il gruppo «Auto Fix Drifts» con le chiavi trama.autoFixDrifts e trama.autoFixCriticalDrifts; extension/src/webview/settings/index.ts, funzione booleanControl: una casella per ciascuna; extension/package.json, le due voci trama.autoFixDrifts e trama.autoFixCriticalDrifts.
