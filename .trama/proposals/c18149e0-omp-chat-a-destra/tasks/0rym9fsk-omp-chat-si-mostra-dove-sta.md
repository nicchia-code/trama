---
technical: false
refs:
  - omp-chat-conversation
  - requirements/quality#omp-chat-conversation
---
# omp Chat si mostra dove sta

La chat di una conversazione di omp Chat sta nella vista omp Chat dell'editor in uso: in VS Code la barra laterale secondaria, a destra, in un contenitore suo con la sua icona; in Cursor il pannello in basso, oppure dove lo sviluppatore l'ha portata a mano (per esempio a destra con Move View → «New Secondary Side Bar Entry», che Cursor ricorda). Cursor si riconosce come Trama fa già, dal nome dell'applicazione che contiene «Cursor».

Quando una conversazione si apre per un lavoro (design, scan, Run), la vista omp Chat si mostra sulla sua scheda, dove sta, senza prendere il focus: il cursore e la tastiera restano dove erano. Le conversazioni di Quick Task e di Ask more prendono anche il focus, nel campo del messaggio.

Dopo un ricaricamento della finestra, se l'agente lavorava, la conversazione riprende: Trama le manda il messaggio fisso che chiede all'agente di continuare il lavoro interrotto, e Run, annunci e Task presi restano suoi. Anche qui la vista omp Chat si mostra sulla conversazione senza focus, come all'apertura.

In tutti questi casi la vista si mostra attraverso la vista dell'editor in uso (quella della barra laterale secondaria fuori da Cursor, quella del pannello in Cursor), lasciandola nel posto in cui si trova: nessun altro comando apre, chiude o sposta barre laterali o pannelli.

Il documento delle prove a mano `docs/uat.md`, sezione Z, è aggiornato: la prima prova non dice più che la vista sta nel pannello in basso e si può trascinare, ma fa provare la vista nella barra laterale secondaria di VS Code 1.106 o successivo e nel pannello in basso di Cursor 3.27.6, anche dopo averla portata a destra a mano; le prove di compatibilità dicono che è provato con omp 18.12.6 (`omp acp`, protocollo ACP 1) e che le verifiche aperte si rifanno a ogni versione di omp che cambia ACP. Le prove verificano che design, scan e Run aprono la conversazione senza focus, che Quick Task e Ask more prendono il focus, e che un ricaricamento durante un Run riprende la conversazione mostrandola senza focus, in entrambi gli editor.
