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
cleared:
  qk569ldq:
    title: Resolve istantaneo
    proposal: n4a9dliq
    tag: Async Drift Resolver
    finished: 2026-10-21T09:36:28.495Z
    refs:
      - drift-resolution
      - question-round
      - panel/Board
      - requirements/rules#drift-resolution
      - requirements/ui#drift-resolution
      - requirements/quality#drift-resolution
  jemjruvm:
    title: Domanda pronta nei Drift
    proposal: n4a9dliq
    tag: Async Drift Resolver
    finished: 2026-10-21T09:28:23.899Z
    refs:
      - drift
      - requirements/data#drift-resolution
  52cbkqx7:
    title: Risoluzioni da domanda pronta
    proposal: n4a9dliq
    tag: Async Drift Resolver
    finished: 2026-10-21T09:20:59.159Z
    refs:
      - proposal
      - requirements/data#proposal
  gya21o2b:
    title: Skill della domanda pronta
    proposal: n4a9dliq
    tag: Async Drift Resolver
    finished: 2026-10-21T09:19:50.869Z
    refs:
      - agent-launching
      - requirements/tech#drift-resolution
  5os4goao:
    title: Impostazione Async Drift Resolver
    proposal: n4a9dliq
    tag: Async Drift Resolver
    finished: 2026-10-21T09:19:42.109Z
    refs:
      - panel/Settings
      - requirements/ui#panel/Settings
---
# Async Drift Resolver

Le risoluzioni nate dalla risposta a una domanda pronta portano `prepared: true` e non fermano `Resolve` (T1). L'impostazione sperimentale `trama.experimentalAsyncDriftResolver` esiste, sta nella scheda Settings e aggiunge la sua frase alle istruzioni che possono registrare Drift (T2). Il Drift conserva la sezione `## Prepared question`, con `trama drift edit`, impronta, validità, `job` e i filtri di `drift list` (T4). Le skill insegnano a preparare e usare le domande pronte (T3). `Resolve` apre la domanda senza agente, scrive la risoluzione da sé o lancia l'agente con la risposta (T5).
