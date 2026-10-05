---
column: done
technical: false
refs:
  - panel/Board
  - task/To do
  - requirements/rules#task
  - requirements/ui#panel/Board
drift: null
proposal: c3b518a6
agent: false
created: 1970-01-01T00:00:00.127Z
---
# Make Run all To do and Run this design unavailable when no Task in To do is runnable

Run all To do non è disponibile mentre un Task è preso dall'agente e quando nessun Task in To do è eseguibile; Run this design, allo stesso modo, quando un Task di quella design è preso e quando nessuno dei Task della design in To do è eseguibile. Il bottone è disabilitato anche quando ogni Task in To do (della design, per Run this design) è bloccato; il tooltip dice che tutti i Task sono bloccati e nomina il Drift o il Task di riparazione del primo di essi. Se valgono entrambi i motivi, il tooltip dà quello dell'agente al lavoro. Il bottone disabilitato ha anche la descrizione per le tecnologie assistive, come oggi per il caso del Task preso. Lanciare l'azione quando non è disponibile è rifiutato come già avviene per il Task preso.
