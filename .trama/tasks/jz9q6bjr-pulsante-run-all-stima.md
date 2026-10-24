---
column: done
technical: false
refs:
  - panel/Board
  - requirements/ui#drift-resolution/Running tasks
drift: null
proposal: l0hv1zbz
agent: false
created: 2026-10-24T16:33:21.592Z
finished: 2026-10-24T16:42:22.864Z
---
# Pulsante Run all con la stima

Sulla Board, mentre un Run all lanciato da questa finestra non è finito (sequenza per modello compresa), il pulsante `Run all` in fondo ad `Active` resta indisponibile, ma al posto del suo nome dice quanto tempo manca. Alla fine del Run all torna `Run all`. Il Run di un solo Task, uno scan, un design, un import o una risoluzione lasciano il pulsante come oggi: testo `Run all`, icona `Play`, nome accessibile `Run all the Tasks in To do` e i loro motivi.

Il webview riceve la stima dall'host nel messaggio `snapshot`, campo `runEstimate`:
- `null` senza Run all;
- `{ estimating: true }` mentre la stima è in calcolo;
- `{ low, high, over }` con `low` e `high` in minuti non arrotondati, `over` vero quando il Run all è più lungo del previsto.

Una funzione pura di `extension/src/webview/board/logic.ts` ne ricava il testo, la prima riga del tooltip e il nome accessibile.

Il pulsante resta al suo posto, largo quanto la colonna, disabilitato. I motivi di oggi restano nel tooltip e nella descrizione accessibile, nello stesso ordine. Al posto di `Play` c'è l'icona `Clock` di `lucide-react`, a sinistra del testo.

Testo del pulsante:
- `Estimating time left…` in calcolo.
- Con un limite alto sotto i 60 min, `~<basso>–<alto> min left`, con i limiti arrotondati al minuto, almeno 1 (per esempio `~15–35 min left`).
- Da 60 min in su, `~<basso>–<alto> h left`, in ore arrotondate alla mezz'ora, almeno mezz'ora, con il punto (per esempio `~1–2.5 h left`).
- Con i limiti uguali, `~<n> min left` o `~<n> h left`.
- Con `over`, `Taking longer than expected`.

Tooltip: la prima riga è il testo della stima rifatta, anche quando il pulsante dice `Taking longer than expected`, oppure `Estimating time left…`; sotto, i motivi di oggi.

Nome accessibile:
- `Run all, about <basso> to <alto> minutes left` (o `hours`);
- `Run all, about <n> minutes left` con i limiti uguali;
- `Run all, estimating time left` in calcolo;
- `Run all, taking longer than expected` oltre la stima.

La descrizione accessibile porta i motivi come oggi. Un cambio della stima non è annunciato alle tecnologie assistive. Il testo cambia senza animazione, senza barra e senza conto alla rovescia al secondo. I testi sono in inglese e non seguono `trama.language`.

Il codice di `extension/src/webview/board/index.tsx` che cerca `Run all` per dargli il focus dopo Delete non usa più il nome accessibile, che ora cambia: usa un attributo `data-` stabile del pulsante.

Test del webview:
- testi in minuti e in ore, limiti uguali;
- in calcolo e più lungo del previsto;
- nome accessibile e icona `Clock`;
- pulsante di sempre fuori da un Run all.
