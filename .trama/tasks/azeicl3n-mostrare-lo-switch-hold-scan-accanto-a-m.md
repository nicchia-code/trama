---
column: done
technical: false
refs:
  - panel/Open
  - developer.TURN_SCAN_HOLD_ON
  - developer.TURN_SCAN_HOLD_OFF
  - requirements/ui#scan-hold
  - requirements/tech#scan-hold
drift: null
proposal: u935y83q
agent: false
created: 2026-10-07T05:20:42.420Z
finished: 2026-10-07T05:29:26.803Z
---
# Mostrare lo switch Hold scan accanto a Multi-branch su ogni scheda del pannello

In Diagramma, Board e Requirements, subito dopo lo switch `Multi-branch`, uno switch `Hold scan` (etichetta `Hold scan · N` con N > 0 in sospeso), tooltip `When on, approvals wait and one scan runs when you turn it off.`, ruolo switch, nome accessibile `Hold scan` più `, N held` con N > 0, stato acceso/spento annunciato. Testi in inglese, indipendenti da `trama.language`. Un click cambia subito, senza conferma; le tre schede, anche quella nascosta, mostrano sempre lo stesso stato e numero. Stato illeggibile: switch spento e avviso `Trama could not read the Hold scan switch, so it is off.`. Scrittura fallita: lo switch resta com'era e avviso `Trama could not save the Hold scan switch.`.
