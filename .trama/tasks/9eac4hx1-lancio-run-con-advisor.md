---
column: done
technical: false
refs:
  - agent-launching
  - requirements/rules#work
  - requirements/tech#agent-launching
  - requirements/quality#agent-launching
  - requirements/ui#agent-launching
drift: null
proposal: ld5527fo
agent: false
created: 2026-10-19T20:15:55.261Z
finished: 2026-10-19T20:25:53.742Z
---
# Lancio dei Run con advisor

Fatto quando, con l'Advisor Scanner attivo, letto quando il lavoro sta per partire:
- ogni Run lanciato con omp (un Task, `Run all`, il Run automatico, ogni Run di una sequenza per modello) parte con `omp --hook <modulo> --advisor --config <overlay> [--model <m>] <prompt>`, senza `--slow`; l'overlay, scritto a ogni lancio in `ExtensionContext.globalStorageUri`, porta `modelRoles.advisor` con `trama.scan` come stringa YAML citata solo se il ruolo non è vuoto, e `task.agentAdvisor` con `task: "on"`; il percorso è citato per la shell;
- l'istruzione del Run porta, dopo la frase del limite e prima di quella della lingua, la frase "The Advisor Scanner is on: skip the pre-flight and the targeted end-of-run scan; the omp advisor checks the code against the Model during the run." e non porta la frase dei sotto-agenti di confronto;
- design, import, Resolve Drifts, la preparazione della risoluzione automatica e la richiesta di setup partono come oggi, senza advisor;
- una richiesta di scan del Sistema o di Feature che arriva all'editor è rifiutata dicendo che l'Advisor Scanner è attivo, e non cambia il ricordo dell'ultimo scan globale;
- gli advisor di Trama, con le istruzioni di `.omp/WATCHDOG.yml`, tacciono fuori da un Run con la frase dell'Advisor Scanner; nel Run mandano una nota all'agente quando il lavoro di un Task si allontana dal Modello e archiviano con `trama drift new`, senza `--task` né `--not-blocking`, le differenze nel codice già esistente, seguendo `rules#drift`; non archiviano Task, non modificano file e non decidono;
- il Run finisce solo dopo la revisione finale di `Trama final reviewer`: l'hook di Trama segnala il riposo dopo l'attesa degli advisor, verificato con omp 18.12, così `trama.autoExit` non chiude il terminale su una revisione in corso;
- con l'impostazione spenta, o con `chat` o `claude`, righe di comando e istruzioni sono quelle di oggi;
- la descrizione di `trama.scan` dice che, con l'Advisor Scanner, lo usano anche gli advisor di omp che guardano i Run.
