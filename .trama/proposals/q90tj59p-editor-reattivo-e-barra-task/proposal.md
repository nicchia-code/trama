---
status: approved
base:
  editor-panel/panel.md: 9c5f1c27063d70769172410cfb813c433ecaacae7630bc238b352fca49696083
  agent-launching/feature.md: 9142dd81ac6d3608ae4e5d36e915555b8fc5316d39dcddfff0fc92cdc4c32307
  agent-launching/omp-chat-conversation.md: 8c883720995c6bb8f3b1a7609e1722e09756cecb89d939a73be5138ed1a460d8
  work/task.md: 2be62b09d3446e6c1af1412aca73c978f9318af3728129332fb9d3cd289c0b73
  requirements/quality/panel.md: 3f0cfeb26217b1f9e98213aece1e2cbad50c1bbd0515498f65dfaa7ca394cd86
  requirements/quality/main.md: 5a34910211a89e965ab2a5e3fe631d8d9e9d69d30be3f80e0bfcb3a758206b92
  requirements/quality/omp-chat.md: 7aa380aa9e3167c57d5f5fa18320575f0856671e5e01f0c582d1131ab6202740
  requirements/quality/agents.md: 9946149f9cc028909d17adaafef638d54b75d7cc308f8a22e4b332fd4b2a3590
  requirements/rules/agent-terminal.md: d1e205f4f80d94fca8be9119e066b05acdf7463950fdf4c83faf3c5fc6490e9f
  requirements/rules/omp-chat-conversation.md: 0bdac2a9b6657c03564b66255fb808d95033f1803ca991236e6fe1e6a391d974
  requirements/rules/team.md: e938bc5638911642eb1501db178d79b694fcea619396ea9b4666597f205b866d
  requirements/tech/agent-terminal.md: 2aa1117f97a58495643044aa36d614ebe2322cdad04c64ac196d95ab518f66c1
  requirements/tech/omp-acp.md: 753d734cc2854cc5db77dcff9c137fa82298f1932dae3a2c96407a7389d6bbd3
  requirements/tech/settings.md: fd4ae17612591c4b488982af77cc54d1445847243bebb1350af6eca962202c50
  requirements/tech/solo-mode.md: 88f9dedd00500f0237dccfc72bb19df187cfa42761d4680446e3ca10061f756f
  requirements/tech/team.md: 649abeaed94f3f915ba3da6408d7862f70cc14ea0f3e4dd0949ac4c291d202d2
  requirements/tech/solo-merge.md: 388f4d7da0e5f30c9512665dc00f1d893dacda77059ba4aa152efe808c4e0d76
  requirements/tech/execution-check.md: db7b033188993fb95159931b7423cfe4ec82313ef5fcb3ab32df13f9e0b7d9a3
  requirements/tech/agent-hooks.md: 082c54ada59fdc723fa77c7c467dac8a96cc656a8ef21edbec01dc6f93757889
  requirements/tech/picture.md: 5ed114ec1ab5722cebb14f66138a33f58c274ef9a265ca5b753e5dbc52316957
  requirements/tech/menu-laterale.md: 3bbb4a21b4156c8cf7f8bd9c86275d8d47c63fa7098f01b6117a386b41fd7fd3
  requirements/tech/omp-chat-resume.md: c75385ce2700e543c12fe6187338e5d3538eb7a8e8de3b6cb43db61a9937662a
  requirements/tech/task-progress.md: 78a49b512217b948655e7411051e9530761919f4004e49ed7443fb9ea84b020a
  requirements/ui/task-progress.md: df8b52b98ae122140b3a88a90a6d26b83a6d42e52a98a41c7a828918ca6bfe6f
  requirements/data/work.md: 7098147d4204abba60b7d1501c7f840051655880825795c0fd2d32b615b36bed
  requirements/tech/announcements.md: 8b941a1cf75d58be95d818d6ff730cd4fe764c98cd3bd0887eb00706f08e8ed4
  requirements/ui/omp-chat-conversation.md: 78b3830427955518052f1ab7a8d2192d5ba79c0c1b550a401c86bbe010f4e386
delete: []
request: 2026-10-28T17-17-07
created: 2026-10-28T16:34:34.634Z
label: Prestazioni editor
---
# Editor reattivo e barra Task

Sul computer di lavoro (macOS, con molto software aziendale e antivirus che ispeziona ogni avvio di processo e accesso ai file) ogni operazione dell'editor è in ritardo, dalla comparsa di una chat al cambio di scheda. L'esplorazione del codice ha trovato la causa principale nell'host dell'estensione, che si blocca: avvia `git` in modo sincrono 3–4 volte a ogni quadro e a ogni file salvato nel progetto, ricostruisce il quadro controllando ogni file di `.trama/` (due volte per azione) e attende in modo attivo nelle scritture; la scheda Settings avvia processi a ogni comparsa; le conversazioni di omp Chat aspettano omp e il controllo degli aggiornamenti prima di comparire e ridisegnano tutti i messaggi a ogni pezzo di risposta. La richiesta chiede anche di togliere la barra di avanzamento del singolo Task (non quella di Run all).

Decisioni:
- Computer di lavoro: macOS; le correzioni specifiche di Windows entrano lo stesso.
- git: mai sincrono nell'host; origin letta una volta e riletta solo quando cambia la configurazione git; stato di Merge calcolato in background, solo con il menu laterale visibile, dai cambi di HEAD, index e refs, non da ogni file del progetto.
- Quadro: rilegge solo i file segnalati dal watcher, Modello e Requisiti compresi; controllo completo all'apertura e quando la finestra torna in primo piano; un'azione dà un solo quadro; ghost della barra di stato e controllo di esecuzione usano il quadro.
- Settings: lo stato di omp e l'elenco dei modelli si verificano una volta per finestra e dopo i cambi che contano (percorso di omp, installazione, login, logout, chiave Cursor, certificati); le altre comparse di Settings e della Board non avviano processi.
- Conversazione di un lavoro: la scheda compare subito in avvio, come Ask more; se l'apertura fallisce sparisce e l'istruzione va al terminale come oggi.
- Controllo degli aggiornamenti di omp: in background, il lancio non lo aspetta; una versione nuova si installa prima del lancio successivo, che aspetta solo l'aggiornamento.
- Correzioni interne tutte incluse: disegno di omp Chat solo di ciò che cambia, storia mandata in blocco, nessun git sincrono alla nascita della vista, programma e versione di omp tenuti per finestra, scritture e lock senza attesa attiva, istante di avvio dei processi senza PowerShell nell'hook.
- Ripresa delle conversazioni salvate: subito, insieme, quelle il cui agente lavorava; quelle a riposo dopo, una alla volta.
- Registro delle operazioni lente: canale Output «Trama Performance», sempre attivo, solo operazioni dell'host oltre 200 ms.
- Scheda del Task preso: spariscono barra e testo della percentuale; la dichiarazione e la riga di comando restano.
