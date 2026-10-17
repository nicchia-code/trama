---
column: done
technical: true
refs:
  - requirements/ui#agent-launching
drift: drs8x2wc
proposal: null
agent: false
created: 2026-10-17T12:11:32.245Z
finished: 2026-10-17T12:32:55.868Z
---
# Fix code to match the Requirements: Le descrizioni di trama.execution e trama.analysis non dicono tutti i lavori che usano il modello

## What happens

La descrizione di trama.execution nomina solo implement e implement all con la scansione finale mirata: non nomina il Run automatico né il pre-flight del Run. La descrizione di trama.analysis non nomina la preparazione della risoluzione automatica dei Drift. Il requisito chiede che le tre descrizioni dicano quali lavori usano il modello.

## What should happen

Il requisito ui#agent-launching chiede che trama.analysis, trama.scan e trama.execution dicano quali lavori usano quel modello. La regola agent-launching assegna a trama.execution il Run automatico e il pre-flight, e a trama.analysis la preparazione della risoluzione automatica.

## Chosen option

**Completare le due descrizioni**

Aggiungere a trama.execution il Run automatico e il pre-flight, e a trama.analysis la preparazione della risoluzione automatica, lasciando invariato il resto del testo.

## Where in the code

extension/package.json, impostazioni trama.execution e trama.analysis (markdownDescription), nelle righe delle due impostazioni
