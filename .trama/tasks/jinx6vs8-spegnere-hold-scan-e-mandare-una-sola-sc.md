---
column: done
technical: false
refs:
  - developer.TURN_SCAN_HOLD_OFF
  - scan-hold/On/developer.TURN_SCAN_HOLD_OFF
  - scan-hold.RELEASED
  - agent-terminal/No agent terminal/scan-hold.RELEASED
  - agent-terminal/Agent running/scan-hold.RELEASED
  - agent-terminal/Agent idle/scan-hold.RELEASED
  - requirements/rules#scan-hold
  - requirements/rules#agent-terminal
  - requirements/ui#scan-hold
drift: null
proposal: u935y83q
agent: false
created: 2026-10-07T05:20:41.965Z
finished: 2026-10-07T05:27:49.035Z
---
# Spegnere Hold scan e mandare una sola scansione delle Proposal in sospeso

Spegnere senza conferma. Sospeso vuoto: scrive `off`, non invia nulla, nessun avviso. Altrimenti considera le Proposal in sospeso il cui ambito di scansione ha ancora un riferimento dentro una Feature esistente; se nessuna: scrive `off`, svuota `held` e mostra `Hold scan is off. The held Proposals no longer affect any Feature, so there was nothing to scan.`. Se ce ne sono, invia l'istruzione della scansione in sospeso (dalla più vecchia alla più recente, testo esatto di `rules#scan-hold`, prosecuzione con `trama-implement` solo con `trama.autoImplement` acceso, con una sola Proposal identica a quella della scansione automatica, frase della lingua se impostata) con la catena di consegna dei pulsanti: chiede una volta il comando dell'agente se serve, in Cursor ripiega su deeplink e appunti invece dell'avviso «Scan now»; terminale chiamato `Scan`, aperto o riusato come per la scansione automatica. Appena consegnata scrive `off` e svuota `held`. Se non consegnata (richiesta annullata, finestra esterna che non si apre) resta `on`, `held` intatto e compare `The held scan was not started, so Hold scan stays on.` oltre al messaggio del launcher. Le scansioni a mano e quella dopo l'unione di un giro non leggono né cambiano il sospeso.
