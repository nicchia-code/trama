---
column: done
technical: true
refs:
  - requirements/ui#question-round
drift: null
proposal: null
agent: false
created: 2026-10-06T16:18:23.150Z
finished: 2026-10-06T16:20:30.433Z
---
# Tenere il focus dentro l'overlay delle domande anche dopo un clic fuori dai controlli

Finché l'overlay di un round è aperto, il focus della tastiera resta sempre al suo interno, come chiede il Requisito (l'overlay è un dialogo che tiene il focus al suo interno).

Oggi il contenimento funziona solo se il focus è già su un controllo dell'overlay. Dopo un clic sullo sfondo semitrasparente, o su una parte dell'overlay che non prende il focus, il focus torna al documento e Shift+Tab (o Tab dopo l'ultimo controllo) porta su pulsanti delle schede sotto l'overlay, per esempio i collegamenti del Diagramma, che si possono poi attivare con Invio; anche Esc arriva allora alle schede.

Quando è fatto: con l'overlay aperto (domanda, riepilogo o conferma di Skip all), nessuna sequenza di clic, Tab e Shift+Tab porta il focus su un elemento delle schede sotto l'overlay, e i tasti non agiscono su di esse. Con l'overlay ridotto a barra le schede tornano utilizzabili normalmente.
