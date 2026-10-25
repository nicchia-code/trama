---
technical: false
refs:
  - panel/Board
  - requirements/rules#drift-resolution/Running tasks
  - requirements/tech#drift-resolution/Running tasks
  - requirements/ui#drift-resolution/Running tasks
---
# Riferimento di Run all

Un Run all che procede normalmente non deve più passare a `Taking longer than expected`. Oggi, con Parallel Execution, il limite alto usato come riferimento si fissa una sola volta (`runAll.high ??= estimate.high` in `extension/src/host/run-all-estimate.ts`) alla prima stima non nulla, che nasce con il primo `queue` scritto da `trama task list` (`src/cli/work.ts`), 20–40 secondi prima che l'agente registri le scelte `order`/`conflict`: senza catene la stima vale avvio + un solo Task + coda, e lo stato resta acceso fino alla fine. Rifacendo i calcoli sulle registrazioni del progetto, 10 Run all su 16 sarebbero scattati pur andando normalmente.

Quando il Task è finito vale quanto segue (`rules#drift-resolution/Running tasks`, `tech#…`, `ui#…`).

**Registrazioni di un Run.** Per la stima sono del Run solo le registrazioni dei tempi del suo terminale o della sua conversazione fatte dal lancio del Run all in poi. Quelle di prima, di un terminale o di una conversazione riusati, non rendono il Run partito, non fanno il suo piano, non gli danno né gli tolgono Task; per i pesi contano come registrazioni di un altro lavoro.

**Riferimento.** Non esiste finché un Run del Run all non ha preso il suo primo Task: prima di allora il Run all non è mai più lungo del previsto, anche se `queue` e scelte sono già registrati. Al primo Task preso il riferimento è il tempo passato dal lancio più il limite alto (1,5 volte la stima centrale) della stima di quel momento. Si rifà allo stesso modo a ogni cambio del piano: una nuova scelta `order` o `conflict` registrata da un Run del Run all, o un Task che diventa Task di uno dei suoi Run senza esserlo mai stato in questo Run all (per esempio un Task di correzione nato durante la corsa, o un Task non più bloccato). Il solo passare del tempo, la fine di un Task, un Task che esce dai Run e una stima rifatta senza cambio del piano lo lasciano com'è. Una funzione pura di `src/core/run-estimate.ts`, con gli stessi ingressi della stima, dà il piano (Task già preso o no, identità delle scelte, Task che sono stati dei Run); l'host tiene in memoria il riferimento in millisecondi dal lancio e il piano con cui l'ha fatto, e lo rifà quando il piano di adesso ha una scelta o un Task in più, tenendo l'unione.

**Più lungo del previsto.** Il Run all lo è finché il tempo passato dal lancio supera il riferimento attuale, calcolato a ogni ricalcolo e mai tenuto come segno che resta acceso. Quando un cambio del piano porta il riferimento oltre il tempo passato, non lo è più: il pulsante torna a `Running…`, il nome accessibile torna quello con il tempo che manca e la barra all'avanzamento, anche sotto il 95%, con la stessa transizione di 2 secondi della larghezza. Il testo, l'icona e il tooltip di quando è più lungo del previsto non cambiano.

**Avanzamento.** Mentre il Run all è più lungo del previsto vale 0,95, e quel valore non conta come già raggiunto: tornando nei tempi l'avanzamento si calcola di nuovo come oggi, mai sotto il più alto raggiunto fuori da quello stato, e può quindi scendere sotto 0,95.

Non cambiano: i pesi dei Task, il tempo dei Task con Parallel Execution (catena più lunga o somma dei pesi divisa per i posti), avvio e coda, la forchetta del tooltip e i suoi arrotondamenti, quando la stima esiste, la frequenza dei ricalcoli.

Test `bun:test` come in `tech#drift-resolution/Running tasks`: registrazioni di un terminale riusato prima del lancio ignorate per il Run e contate per i pesi; nell'host nessun riferimento e mai più lungo del previsto prima del primo Task preso, con `queue` e scelte già registrati; riferimento al primo Task preso contato dal lancio; riferimento rifatto da una nuova scelta e da un Task nuovo, lasciato com'è dal tempo, dalla fine di un Task e da un Task che esce; un Run all che smette di essere più lungo del previsto dopo un cambio del piano, con l'avanzamento che scende sotto 0,95 ma non sotto il più alto raggiunto fuori da quello stato; la ripetizione di un Run all in parallelo con una catena di `order` registrata circa 20 s dopo il primo `queue`, che non è più lungo del previsto finché finisce entro il limite alto della stima al suo primo Task.
