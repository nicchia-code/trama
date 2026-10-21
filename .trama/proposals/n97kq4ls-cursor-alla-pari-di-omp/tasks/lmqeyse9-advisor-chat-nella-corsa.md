---
refs:
  - task
---
# Corsa con l'Advisor in chat

Con l'Advisor Scanner attivo la corsa salta pre-flight e scansione mirata di fine corsa, e passa dalla verifica direttamente alla History, sia con omp sia nella chat di Cursor (oggi solo con omp: `configuredAdvisorScanner()` e `agentPrompt` in `extension/src/host/agent.ts`, `ADVISOR_SENTENCE`, le istruzioni delle skill `trama-implement`). Nella chat l'advisor è il sotto-agente di revisione di Trama: guarda la corsa mentre lavora e ogni sotto-agente che realizza un Task ha la sua revisione prima di finire. Se il codice di un Task si allontana da Task, Modello o Requisiti l'agente lo corregge prima di portare il Task in Done; una differenza nel codice preesistente, fuori dal lavoro del Task, è registrata come Drift senza origine, con lo stesso effetto del pre-flight sui Task non ancora partiti.
