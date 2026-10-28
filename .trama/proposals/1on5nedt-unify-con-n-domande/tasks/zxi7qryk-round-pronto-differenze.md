---
technical: false
refs:
  - question-round
---
# Round pronto a più domande

Per un Drift unificato con differenze, il round pronto che Trama chiede da sé con Resolve (con l'Async Drift Resolver acceso e una domanda valida per ogni differenza aperta) ha una domanda per differenza aperta, nell'ordine delle differenze, presentate insieme come le domande di qualunque round: stesso overlay, una domanda alla volta con l'indice, il riepilogo finale da cui si inviano le risposte, la raccomandazione di ogni domanda già selezionata e lo spazio per la risposta libera. È Trama ad aspettare e ricevere le risposte, senza agente in attesa, e il round si interrompe solo con la perdita dell'editor, che scarta tutte le risposte senza scrivere nulla.

Saltare alcune domande lascia aperte soltanto le loro differenze, con le loro domande ancora pronte per il prossimo Resolve, e non applica nessuna raccomandazione; le differenze risposte proseguono verso la risoluzione. Se tutte le domande sono saltate non si scrive nulla e il Drift resta aperto con il suo round pronto.

Ask more su una domanda di questo round apre la chat di Ask more come per ogni domanda (la domanda per intero, il testo e le opzioni delle altre domande del round senza risposte) e, come per la domanda pronta di un Drift, porta il riferimento al Drift unificato, che Trama trova dalla differenza della domanda (l'`id` della domanda è il `drift` della differenza). Il round resta in vista con le scelte intatte.
