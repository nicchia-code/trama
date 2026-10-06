---
column: done
technical: true
refs:
  - requirements/ui#panel
drift: null
proposal: null
agent: false
created: 2026-10-06T18:20:33.754Z
finished: 2026-10-06T18:22:43.305Z
---
# Mostrare come Markdown la descrizione delle Aree nella scheda Requirements

Nella scheda Requirements la descrizione di ogni Area (quella che dice quando serve l'Area) è mostrata come testo semplice, mentre la descrizione di un frammento, l'introduzione dell'Area e il testo delle sezioni sono resi come Markdown. Il Requisito vuole che tutta la prosa che il pannello mostra sia resa come Markdown, in ogni scheda.

Fatto quando: la descrizione di un'Area è resa con lo stesso renderer Markdown e con lo stesso aspetto della descrizione di un frammento (grassetto, corsivo, codice in linea e link http/https funzionano; i link si aprono nel browser di sistema tramite l'editor); titolo e identificativo dell'Area restano testo semplice.
