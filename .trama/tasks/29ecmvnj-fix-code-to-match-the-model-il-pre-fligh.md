---
column: done
technical: false
refs:
  - drift-resolution
  - requirements/rules#drift-resolution
drift: tzjdzu3e
proposal: null
agent: false
created: 2026-10-14T12:26:20.160Z
finished: 2026-10-14T12:28:56.804Z
---
# Fix code to match the Model: Il pre-flight interrotto di un Run non registra uno scan fallito

## What happens

Quando un Run chiude mentre il suo pre-flight non ha ancora dichiarato l'esito, il controllo viene ritirato e il developer riceve l'avviso, ma il progetto non registra nulla: l'ultimo scan fallito non mostra il pre-flight interrotto.

## What should happen

Un pre-flight fallito o interrotto è registrato come uno scan fallito: non sospende la delega e non ferma il Run, ma compare come ultimo scan fallito del progetto, come ogni scan finito senza controllo riuscito.

## Chosen option

**Registrare il pre-flight interrotto come scan fallito**

Quando il Run finisce senza che il pre-flight abbia dichiarato il suo esito, il progetto lo registra come scan fallito con il titolo del controllo, come già accade per uno scan autonomo finito senza controllo riuscito. La delega e il Run restano invariati; `trama drift autopilot` mostra l'ultimo scan fallito. Costo: una voce in più nell'elenco degli scan falliti, da mantenere coerente con gli scan.

## Where in the code

extension/src/host/drift-resolution.ts: receiveCheck and endWhere, which record failed scans only for declared checks and for ended scan jobs, not for a Run's pre-flight.
