# Requirements: Interfaccia, Interfaccia della stima di Run all

Usa quando mostri sul pulsante Run all la stima del tempo che manca a un Run all in corso.

## drift-resolution/Running tasks

- Mentre un `Run all` lanciato da questa finestra non è finito, sequenza per modello compresa, il pulsante `Run all` in fondo ad `Active` resta al suo posto, largo quanto la colonna e disabilitato come oggi, con gli stessi motivi nel tooltip e nella descrizione accessibile e nello stesso ordine (`ui#panel/Board`). Al posto del testo `Run all` mostra la stima (`rules#drift-resolution/Running tasks`), e al posto dell'icona `Play` l'icona `Clock` di `lucide-react`, a sinistra del testo come oggi.
- Testi del pulsante: `Estimating time left…` finché la stima è in calcolo; con la stima, `~<basso>–<alto> min left` (per esempio `~15–35 min left`), oppure `~<basso>–<alto> h left` con le ore e la mezz'ora scritte con il punto (per esempio `~1–2.5 h left`); quando i due limiti sono uguali, `~<n> min left` o `~<n> h left`; quando il Run all è più lungo del previsto, `Taking longer than expected`.
- Tooltip: prima riga la stima rifatta con il testo di sopra (anche quando il pulsante dice `Taking longer than expected`, così la forchetta resta da leggere), oppure `Estimating time left…`; sotto, i motivi di disabilitazione di oggi.
- Nome accessibile: `Run all, about <basso> to <alto> minutes left` (o `hours`), `Run all, about <n> minutes left` con i limiti uguali, `Run all, estimating time left` in calcolo, `Run all, taking longer than expected` oltre la stima. La descrizione accessibile porta i motivi di disabilitazione come oggi. Un cambio della stima non viene annunciato alle tecnologie assistive.
- Un Run di un solo Task, uno scan, un design, un import o una risoluzione in corso lasciano il pulsante come oggi: testo `Run all`, icona `Play`, nome accessibile `Run all the Tasks in To do`, i loro motivi. Alla fine del Run all il pulsante torna così.
- Il testo cambia senza animazione, e il pulsante non disegna nessuna barra né nessun conto alla rovescia al secondo. I testi sono in inglese e non seguono `trama.language`.
