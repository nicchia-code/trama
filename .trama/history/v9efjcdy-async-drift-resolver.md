---
created: 2026-10-21T09:39:06.027Z
updated: 2026-10-21T09:39:06.027Z
summary: Un Drift può conservare una domanda pronta; Resolve la apre subito senza agente e la risposta diventa una risoluzione `prepared` che non ferma le altre.
tasks:
  - 52cbkqx7
  - 5os4goao
  - gya21o2b
  - jemjruvm
  - qk569ldq
---
# Async Drift Resolver

Le risoluzioni nate dalla risposta a una domanda pronta portano `prepared: true` e non fermano `Resolve` (T1). L'impostazione sperimentale `trama.experimentalAsyncDriftResolver` esiste, sta nella scheda Settings e aggiunge la sua frase alle istruzioni che possono registrare Drift (T2). Il Drift conserva la sezione `## Prepared question`, con `trama drift edit`, impronta, validità, `job` e i filtri di `drift list` (T4). Le skill insegnano a preparare e usare le domande pronte (T3). `Resolve` apre la domanda senza agente, scrive la risoluzione da sé o lancia l'agente con la risposta (T5).
