---
status: resolved
resolution: fix-code
refs:
  - drift-resolution
  - requirements/rules#drift-resolution
proposal: null
task: 29ecmvnj
origin: null
critical: false
option: 1
note: null
resolvedBy: zxoqdayf
created: 2026-10-14T12:24:16.164Z
---
# Il pre-flight interrotto di un Run non registra uno scan fallito

## What happens

Quando un Run chiude mentre il suo pre-flight non ha ancora dichiarato l'esito, il controllo viene ritirato e il developer riceve l'avviso, ma il progetto non registra nulla: l'ultimo scan fallito non mostra il pre-flight interrotto.

## What should happen

Un pre-flight fallito o interrotto è registrato come uno scan fallito: non sospende la delega e non ferma il Run, ma compare come ultimo scan fallito del progetto, come ogni scan finito senza controllo riuscito.

## Fix options

### Registrare il pre-flight interrotto come scan fallito

Quando il Run finisce senza che il pre-flight abbia dichiarato il suo esito, il progetto lo registra come scan fallito con il titolo del controllo, come già accade per uno scan autonomo finito senza controllo riuscito. La delega e il Run restano invariati; `trama drift autopilot` mostra l'ultimo scan fallito. Costo: una voce in più nell'elenco degli scan falliti, da mantenere coerente con gli scan.

### Togliere la registrazione dal Model

Il pre-flight interrotto resta solo con l'avviso del controllo ritirato, e il Model e i Requisiti dicono che non è uno scan fallito. Nessuna modifica al codice, ma `trama drift autopilot` non riporta più un pre-flight interrotto tra gli scan falliti: l'informazione resta soltanto nell'avviso del pannello.

## Where in the code

extension/src/host/drift-resolution.ts: receiveCheck and endWhere, which record failed scans only for declared checks and for ended scan jobs, not for a Run's pre-flight.
