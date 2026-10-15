---
column: done
technical: false
refs:
  - panel/Board
  - requirements/ui#panel/Board
drift: null
proposal: null
agent: false
created: 2026-10-14T16:28:21.004Z
finished: 2026-10-14T17:09:07.410Z
---
# Show every reason a Run button is disabled, not only the first

Quando un Resolve Drifts e un Run sono attivi insieme, il motivo che tiene disabilitato ogni pulsante Run deve comparire con tutti i motivi che valgono, nell ordine: prima «Drifts are being resolved», poi «A run is in progress», poi i motivi dei Task (il Task preso dall agente, tutti i Task in To do bloccati). Oggi la Board riceve un solo stato della risoluzione e mostra soltanto il primo motivo, quindi il secondo resta nascosto: serve che entrambi i motivi valgano e siano mostrati insieme nel tooltip e nella descrizione accessibile di ogni pulsante Run.
