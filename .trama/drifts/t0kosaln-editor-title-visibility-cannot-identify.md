---
status: resolved
resolution: fix-code
refs:
  - requirements/ui#design-request
proposal: null
task: impifveg
origin: z3fozcck
option: 1
note: null
resolvedBy: vaoulrok
created: 2026-10-10T15:50:49.239Z
---
# Editor title visibility cannot identify its editor group

## What happens

Con più gruppi, l'estensione può sapere quale richiesta è attiva, ma l'espressione di visibilità dei menu documentata espone solo l'indice del gruppo attivo: non identifica il gruppo a cui appartiene ciascuna barra. Una condizione basata sul documento attivo continua quindi a mostrare il pulsante nei gruppi non attivi; confrontare l'indice con un contesto non documentato non è una soluzione affidabile.

## What should happen

Il pulsante deve comparire soltanto nella barra del gruppo a fuoco, e solo quando quel gruppo mostra una richiesta mai inviata. Le altre schede, comprese richieste già inviate, non devono offrire il pulsante.

## Fix options

### Usare un controllo nell'interfaccia del gruppo attivo

Sostituire il contributo globale alla barra del titolo con un controllo che l'estensione possa associare esplicitamente al gruppo attivo. Richiede una diversa integrazione UI, ma mantiene la visibilità richiesta senza dipendere da contesti non documentati.

### Limitare il pulsante a un solo gruppo

Mostrare il controllo soltanto nell'indice fisso del primo gruppo e mantenere la verifica di idoneità. Evita il pulsante fuorviante altrove, ma gli altri gruppi non possono inviare dalla propria barra e la soluzione scelta non viene soddisfatta.

## Where in the code

extension/package.json: contributes.menus.editor/title; extension/src/host/design-requests.ts: updateContext
