---
status: resolved
resolution: fix-code
refs:
  - drift-resolution/Free
  - requirements/rules#drift-resolution
  - requirements/quality#drift-resolution
proposal: null
task: 7zjaq4xs
origin: null
critical: false
option: 1
note: null
resolvedBy: cc109jp3
created: 2026-10-11T09:26:20.696Z
---
# A coordinator that loses its role keeps the sends it had reserved

## What happens

Le prenotazioni degli invii stanno solo nella memoria della finestra che coordina il progetto. Quando quella finestra perde il ruolo, le prenotazioni che teneva restano lì, e il rilascio che la finestra mittente manda dopo arriva soltanto al nuovo coordinatore, che non la conosce. Se la finestra riacquista il ruolo, quelle prenotazioni sono ancora presenti.

Finché restano, ogni nuovo invio di un Run, di uno scan o di Resolve Drifts, manuale o automatico, di qualunque finestra viva è rifiutato con «another instruction is being sent», e nessuna raccolta automatica parte. Il caso si sblocca solo se la finestra che aveva prenotato viene persa, oppure riavviando il coordinatore.

## What should happen

Una prenotazione serve solo a proteggere l'invio concorrente e non può diventare un lavoro fantasma: un invio che non parte rilascia la prenotazione. La perdita del coordinatore non va interpretata come successo né lascia stato che blocca il progetto, e una finestra non conta ciò che non esiste più.

Quando un coordinatore perde il ruolo, le prenotazioni che teneva devono sparire, così chi lo riacquista riparte da un quadro che conosce soltanto per le finestre vive.

## Fix options

### Azzerare le prenotazioni quando il ruolo si perde

Il coordinatore che si accorge di non avere più il ruolo scarta tutte le prenotazioni tenute. Il rilascio mandato al nuovo coordinatore è innocuo. Costo minimo e nessun timer. Un invio ancora in corso al momento della perdita non è più protetto, ma ormai spetta al nuovo coordinatore decidere.

### Azzerare le prenotazioni quando il ruolo viene riacquisito

Alla ripresa del ruolo il coordinatore scarta le prenotazioni di prima, insieme alla ripresa già richiesta all'acquisizione. Ripara il caso del ruolo ripreso, ma un coordinatore che non lo riprende conserva prenotazioni inutili finché la sua memoria vive.

### Far ridichiarare le prenotazioni alle finestre vive

Come per i lavori già avviati, alla presa del ruolo ogni finestra viva ridichiara le prenotazioni proprie ancora aperte e il coordinatore ricostruisce il quadro da zero. È la più completa, ma aggiunge un messaggio e una risposta nuovi.

## Where in the code

extension/src/host/drift-resolution.ts (sendReservations, reserveSend, releaseSend); extension/src/host/controller.ts (coordinate, gestione di reserve-send e release-send); extension/src/host/questions.ts (isCoordinator)
