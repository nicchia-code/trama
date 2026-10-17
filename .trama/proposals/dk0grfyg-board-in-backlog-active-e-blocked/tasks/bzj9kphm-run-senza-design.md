---
technical: false
refs:
  - task
  - requirements/rules#task
  - requirements/tech#task
---
# Togliere la corsa sui soli Task di un design e rinominare Run all

Quando il Task è finito non esiste più una corsa sui soli Task di un design. Le corse su più Task sono soltanto `Run all` (tutti i Task in To do) e il Run automatico delle correzioni con le loro origini; un Run può anche essere un Task singolo chiesto per nome.

Va tolto dal codice, con cutover pulito e senza shim: l'istruzione che chiede all'agente di realizzare un design, il pulsante e il messaggio `Run this design` con le sue regole di disponibilità, e ogni ambito «design» nel pre-flight, nella scansione mirata di fine corsa e nei titoli dei loro controlli. Il pre-flight resta il primo passo di ogni Run (un Task, `Run all`, il Run automatico). La scansione mirata di fine corsa parte solo se la corsa ha portato almeno un Task in Done, nessun Task del suo ambito è bloccato alla fine (in `Run all` tutti i Task, nel Run automatico le sue correzioni e origini, per un Task singolo quel Task) e la verifica finale passa.

Run Ready Tasks si chiama `Run all`: non è disponibile mentre un Task è preso dall'agente, quando nessun Task in To do è eseguibile, mentre l'agente di risoluzione lavora e, con `trama.submitWhileRunning` spento, mentre un Run lanciato da Trama non è finito (lo stesso Run che rende indisponibili `Resolve all` e `Resolve`). Le stesse ultime due regole valgono per il Run di un Task. Una richiesta di Run che arriva comunque all'editor è rifiutata.

La skill `trama-implement` prende i Task da `trama task next --batch --max <N>` senza mai usare `--proposal` per sceglierli; il filtro `--proposal` resta nella riga di comando. Nella scansione di fine corsa la skill passa `--proposal <id>` sui Task archiviati solo quando la corsa è un Task singolo che fa parte di un design. Il raggruppamento in design resta soltanto in `trama board` della riga di comando, con le regole attuali (almeno due Task, colonna derivata).

Aggiornare la skill `skills/trama-implement`, i testi delle istruzioni di lancio, i test che coprono l'istruzione del design, `Run this design` e gli ambiti del pre-flight e dello scan finale, e la documentazione in `docs/` che li cita.
