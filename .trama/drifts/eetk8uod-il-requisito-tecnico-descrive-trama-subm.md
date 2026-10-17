---
status: resolved
resolution: proposal
refs:
  - requirements/tech#agent-terminal
proposal: null
task: null
origin: null
critical: false
option: null
note: null
resolvedBy: 25k91dh9
created: 2026-10-17T10:31:24.508Z
---
# Il Requisito tecnico descrive trama.submitWhileRunning come stringa enabled/disabled, il codice la tratta come interruttore

## What happens

Il Requisito tecnico dell'agent-terminal dice che `trama.submitWhileRunning` è una stringa con valori `enabled` e `disabled`, default `disabled`, valida anche nel workspace. Il codice lo dichiara come interruttore booleano (acceso o spento) e lo legge come booleano: un valore non booleano vale spento. I Requisiti ui dell'agent-terminal e delle Board dicono interruttore, spento per impostazione predefinita, come il codice.

## What should happen

Il Requisito tecnico dovrebbe descrivere la stessa forma che il codice e gli altri Requisiti già descrivono: un interruttore booleano spento per impostazione predefinita, senza valori testuali. Il Task i1wp24is, chiuso, ha confermato che l'interruttore resta booleano.

## Fix options

### Allineare il Requisito tecnico all'interruttore booleano

Riscrivere la riga del Requisito tecnico agent-terminal che descrive trama.submitWhileRunning come interruttore booleano, spento per impostazione predefinita, come i Requisiti ui. Il codice resta invariato.

### Far accettare al codice i valori enabled e disabled

Cambiare la dichiarazione di trama.submitWhileRunning in package.json in stringa con enum enabled/disabled e la lettura in controller.ts, così il Requisito tecnico vale com'è. Richiede di riaprire il Task i1wp24is e aggiornare i Requisiti ui.

## Where in the code

extension/src/host/controller.ts, lettura di trama.submitWhileRunning nel blocco di avvio dei Run (funzione che calcola il blocco dell'azione); dichiarazione in extension/package.json, impostazione trama.submitWhileRunning
