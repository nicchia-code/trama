---
column: done
technical: false
refs:
  - drift-resolution/Free
  - drift-resolution/In attesa delle scansioni
  - drift-resolution/Running tasks
  - requirements/data#drift-resolution
  - requirements/quality#drift-resolution
  - requirements/rules#drift-resolution
drift: null
proposal: null
agent: false
created: 2026-10-11T09:09:14.382Z
finished: 2026-10-11T09:18:11.740Z
---
# Forget the sends and jobs of a lost editor window

Il coordinatore deve contare soltanto ciò che le finestre ancora vive hanno prenotato o avviato. Oggi la prenotazione di un invio e i lavori annunciati da un'altra finestra restano nella memoria del coordinatore finché quella stessa finestra non ne segnala il rilascio o la fine: se la finestra viene persa fra la prenotazione e il rilascio, o mentre un suo scan o Run è in corso, la prenotazione e il lavoro restano per sempre. Ne segue che ogni nuovo invio, manuale o automatico, di qualunque finestra è rifiutato con «another instruction is being sent», e che la barriera degli scan non si libera mai: nessuna raccolta parte più finché il coordinatore non viene riavviato. Anche una prenotazione presa da un coordinatore che perde il ruolo e poi lo riacquista resta ferma. Deve essere vero a fine lavoro: la perdita di una finestra libera le sue prenotazioni e i suoi lavori come lavoro finito senza esito riuscito (per uno scan: finito per la barriera, non riuscito), senza timer che dichiari finito un lavoro ancora vivo; la perdita del ruolo di coordinatore azzera le prenotazioni tenute; una finestra non autorizza lavoro finché non conosce scan e Run delle finestre vive, e non conta quelli delle finestre che non esistono più.
