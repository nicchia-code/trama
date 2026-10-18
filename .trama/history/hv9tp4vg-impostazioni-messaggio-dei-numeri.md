---
created: 2026-10-17T21:37:03.864Z
updated: 2026-10-17T22:01:23.335Z
summary: Nella scheda Settings il messaggio di un numero non valido sparisce appena il campo torna valido, e il campo numerico prende la larghezza del suo contenuto invece di una larghezza fissa.
tasks:
  - yyivhrhy
  - m82nsywd
---
# Impostazioni: messaggio dei numeri

Nella scheda Settings del pannello, quando un campo numerico torna a un valore valido, il messaggio di errore sparisce subito, mentre si digita, invece che alla perdita del fuoco o con Invio. Un valore ancora non valido resta segnalato e viene valutato al cambio, come chiedono i Requisiti: il valore non viene inviato prima. Cambia solo il gestore dell'evento di input; la validazione resta invariata.
