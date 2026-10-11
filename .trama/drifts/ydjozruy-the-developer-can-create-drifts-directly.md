---
status: resolved
resolution: proposal
refs:
  - drift
proposal: null
task: null
origin: null
option: null
note: null
resolvedBy: g0ucwkt3
created: 2026-10-10T19:30:40.954Z
---
# The developer can create Drifts directly

## What happens

Il comando trama drift new registra un Drift nuovo anche quando lo lancia il developer, senza che un agente lo stia creando.

## What should happen

Il Model dice che un Drift nuovo viene creato dall’agente. Il developer dovrebbe poter decidere sui Drift, non crearne uno direttamente.

## Fix options

### Restrict Drift creation to agents

Rifiutare trama drift new quando non viene eseguito dall’agente, così ogni Drift nasce dal confronto dell’agente con il codice. Il developer continua a poterli risolvere.

### Allow developer-created Drifts

Aggiornare il Model per autorizzare anche il developer a registrare un Drift. Si conserva la possibilità di annotare manualmente una differenza, ma si amplia chi può avviare il ciclo di decisione.

## Where in the code

src/cli/commands.ts, the drift new command handler
