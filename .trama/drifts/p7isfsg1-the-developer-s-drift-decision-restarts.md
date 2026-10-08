---
status: resolved
resolution: fix-code
refs:
  - announcement/Announced/time.QUIET_PERIOD_ELAPSED
  - requirements/rules#announcement
  - requirements/tech#announcement
proposal: null
task: vjbfku68
origin: null
option: 1
note: null
created: 2026-10-08T05:46:19.655Z
---
# The developer's Drift decision restarts the quiet period of the agent's announcements

## What happens

Ogni volta che nasce un Task, i quindici minuti di quiete di **tutti** gli annunci in attesa ripartono, anche quando il Task non lo archivia l'agente. In particolare, quando il developer sceglie **Fix the code** su un Drift (dal pannello o con `trama drift resolve`), il Task di correzione che Trama crea conta come attività dell'agente: i ghost restano sulla Board fino a quindici minuti in più anche se l'agente si è già fermato.

Quando la decisione parte dal pannello, è l'estensione a riscrivere il campo `touched` di ogni annuncio, oltre a cancellarli e ad aggiornare il titolo dei Writing.

## What should happen

I quindici minuti ripartono solo per attività **dell'agente**: annunciare una scheda o un controllo, cambiare una Draft annunciata, archiviare una scheda, cambiare la fase di un controllo (`rules#announcement`). Una decisione del developer su un Drift non è attività dell'agente e non sposta il ritiro dei ghost.

L'estensione cancella gli annunci quando li ritira e può aggiornare solo l'H1 di un annuncio Writing; il resto lo scrive la riga di comando (`tech#announcement`).

## Fix options

### Count only the agent's filing

Il Task di correzione creato dalla decisione del developer non rinfresca più gli annunci; restano attività solo le schede archiviate dall'agente. Cambia poco: il ritiro per quiete torna puntuale e l'estensione smette di riscrivere `touched`. Costo: distinguere nel punto comune chi crea il Task.

### Accept developer decisions as activity

Si lascia il codice com'è e si cambiano Requisiti e Modello dicendo che anche il Task nato da una decisione del developer riavvia i quindici minuti, e che l'estensione può riscrivere `touched`. Nessun lavoro sul codice, ma la regola della quiete diventa meno precisa: un ghost di un agente fermo può restare più a lungo.

## Where in the code

src/core/work.ts: `resolveDrift` chiama `newTask`, che chiama `deliverCard` → `markActivity` in src/core/announcements.ts anche senza annuncio nominato.
