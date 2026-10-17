---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#project
proposal: null
task: np58667u
origin: null
critical: false
option: 1
note: null
resolvedBy: spxm8wgh
created: 2026-10-16T13:28:54.099Z
---
# Il programma trama incluso nell'estensione non arriva nel PATH dei terminali dell'editor

## What happens

Nei terminali che Trama apre nell'editor il programma `trama` incluso nell'estensione non è disponibile: se il developer non l'ha installato a parte, l'agente omp non riesce a segnalare la fine del suo lavoro. Il terminale resta aperto e la corsa non finisce da sola, anche con la chiusura automatica accesa.

## What should happen

Il Requisito dice che, quando il pacchetto contiene il programma `trama`, la sua cartella va per prima nel PATH dei terminali dell'editor, così che l'agente lo trovi senza installazioni a parte. Il Model dice che, a fine lavoro, il terminale si chiude e i Task presi e gli annunci vengono rilasciati: per omp questo passa dal segnale che chiama `trama`, quindi il PATH deve essere quello previsto.

## Fix options

### Preparare il PATH all'avvio

Chiamare all'attivazione dell'estensione la preparazione del PATH dei terminali che già esiste ma non viene mai usata. Il programma incluso diventa disponibile in ogni terminale dell'editor, anche in quelli che Trama non ha aperto. Costo: ogni terminale dell'editor vede per primo il programma incluso, non solo quelli dell'agente; la preparazione va rifatta se il pacchetto cambia percorso.

### Passare il percorso all'hook di omp

Il terminale che Trama apre per omp riceve il percorso assoluto del programma incluso in una variabile d'ambiente, e il modulo dell'hook lo usa come già fa Claude Code. Il PATH dei terminali resta com'è. Costo: una variabile in più sul terminale dell'agente e una modifica del modulo dell'hook di omp, da verificare con omp.

## Where in the code

`extension/src/host/main.ts`: la funzione che prepara il PATH dei terminali (`exposeBundledCli`) esiste ma `activate` non la chiama mai. `extension/src/omp/trama-hook.ts`: il segnale di fine lavoro chiama `trama` dal PATH.
