---
column: done
technical: false
refs:
  - drift-resolution/Running tasks
  - requirements/rules#drift-resolution/Running tasks
  - requirements/rules#work
  - requirements/tech#drift-resolution/Running tasks
drift: null
proposal: l0hv1zbz
agent: false
created: 2026-10-24T16:33:21.592Z
finished: 2026-10-24T16:39:59.806Z
---
# Stima di Run all nel core

Mentre un Run all lanciato dalla finestra è in corso (sequenza per modello compresa, dal lancio alla fine del suo ultimo Run o al suo arresto), Trama calcola da sola, senza l'agente e senza nessun modello, quanto tempo manca, e l'host la manda al webview. Il Run di un solo Task non ha stima.

Il calcolo è una funzione pura in `src/core/run-estimate.ts`, con le costanti in un solo posto e con un nome:
- Task di un Run: quelli eseguibili in To do del suo ambito (per un Run di una sequenza, del suo gruppo) e quelli In progress presi dal suo terminale o dalla sua conversazione. Un Task di cui il Run ha registrato la fine (`done`, `unchanged`, `drift`) non conta più. I Task bloccati non contano.
- Peso di un Task: 1 min per un Task di correzione (con un Drift). Per gli altri, la media delle durate dei Task finiti `done` nelle registrazioni dei tempi, solo sopra i 30 s e solo dei lavori diversi dal Run all in corso. Con meno di 10 durate così, 9 min. Le durate si ricavano dalle coppie `task-start`/`task-end` dello stesso terminale, come in `timingJobs`. Un Task In progress pesa il suo peso meno il tempo da quando il Run lo ha preso, mai meno di 1 min.
- Con Parallel Execution, ogni scelta `order` o `conflict` del Run fa aspettare il primo Task della scelta agli altri Task della scelta che sono del Run. Un arco che chiuderebbe un ciclo non conta (visita in profondità). Il tempo dei Task è il più grande fra la catena di attese più lunga e la somma dei pesi divisa per i posti del Run (N o la sua parte). Senza Parallel Execution è la somma dei pesi.
- Stima di un Run partito: 0,5 min di avvio finché non ha preso nessun Task, più il tempo dei Task, più 2,5 min di coda. Quando non resta nessun Task, solo la coda: 2,5 min meno il tempo dall'ultima fine di Task del Run, mai meno di 0,5 min. Un Run non partito vale avvio, più la somma dei pesi dei suoi Task, più coda.
- Sequenza: con i Run uno dopo l'altro, la somma delle stime; con i Run insieme, la più lunga, dove un Run che aspetta un posto vale la stima più breve fra i Run partiti più la propria.
- La stima è in calcolo (`null`) finché, con Parallel Execution, nessun Run ha una prima registrazione del piano (una scelta, un Task preso o una `queue`). Senza Parallel Execution c'è dal lancio.
- Il risultato è `{ low, high }` in minuti: la stima per 0,7 e per 1,5.

L'host tiene nel `Job` di tipo `run` (`extension/src/host/drift-resolution.ts`), solo in memoria:
- che è un Run all;
- l'istante del lancio;
- i gruppi decisi al lancio da `planRuns`, con Task, posti e terminali o conversazioni man mano che partono;
- Parallel Execution letta al lancio;
- il limite alto della prima stima.

Il Run all è più lungo del previsto quando il tempo dal lancio supera quel limite, e lo resta fino alla fine. L'host rifà la stima a ogni cambio sotto `.trama/` visto dal watcher `**/.trama/**` e con un timer di 60 s, che c'è solo durante un Run all della finestra e si ferma alla sua fine. Manda nel messaggio `snapshot` il campo `runEstimate`:
- `null` senza Run all;
- `{ estimating: true }` mentre la stima è in calcolo;
- `{ low, high, over }` con la stima.

Il timer manda un messaggio solo quando il risultato cambia.

La stima non scrive nulla sotto `.trama/`, non cambia le registrazioni dei tempi né `trama timing list` e si dimentica alla fine del Run all. Le registrazioni dei tempi le legge, oltre al riassunto per il developer, soltanto questa stima. Nessun comando nuovo e `docs/cli.md` non cambia.

Test `bun:test` in `src/core`:
- catena di `order` e attesa da `conflict`;
- ciclo scartato;
- posti che limitano;
- peso di un Task di correzione;
- storia sotto le 10 durate e durate sotto i 30 s escluse;
- Run in corso escluso dai pesi;
- Task In progress mai sotto 1 min;
- avvio, coda e coda dopo l'ultimo Task;
- sequenza uno dopo l'altro e insieme;
- in calcolo prima del piano.
