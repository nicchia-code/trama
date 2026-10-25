---
created: 2026-10-25T20:11:32.827Z
updated: 2026-10-25T20:11:32.827Z
summary: Gli handle di GitHub Enterprise Managed Users (come 32984238_EYGS) sono validi nelle persone del Team e diventano link nelle menzioni del Markdown del pannello.
tasks:
  - 7kugo8i9
  - vor05p4e
---
# Handle EMU di GitHub

Il campo GitHub handle di una persona accetta anche la forma <nome>_<shortcode>, con un solo underscore seguito da lettere e cifre e 39 caratteri al massimo; il messaggio di errore nomina lo shortcode facoltativo. Il renderer Markdown condiviso (pannello, omp Chat, anteprima delle issue di un handoff) riconosce la stessa forma nelle menzioni @ e le trasforma in link al profilo GitHub; un nome con due underscore resta testo.
