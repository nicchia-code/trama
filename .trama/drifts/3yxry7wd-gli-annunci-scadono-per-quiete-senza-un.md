---
status: resolved
resolution: fix-code
refs:
  - announcement/Announced
  - requirements/rules#announcement
  - requirements/tech#announcement
proposal: null
task: 1932t0pv
origin: null
option: 1
note: null
resolvedBy: 5mztm9sl
created: 2026-10-10T12:48:09.666Z
---
# Gli annunci scadono per quiete senza un segnale di fine lavoro

## What happens

Un annuncio ancora in attesa viene ritirato dopo quindici minuti senza attività, anche se nessun segnale dichiara finito il lavoro. Il conteggio è controllato ogni trenta secondi, sospeso durante le domande e prorogato dalle modifiche della Draft, dai comandi di sola lettura e dai segnali di vita dell’hook. Inoltre, l’attività relativa a un annuncio aggiorna anche gli altri annunci del progetto. Questo può far sparire un ghost mentre l’agente sta ancora lavorando e mostrare un avviso di mancata consegna non sostenuto da un evento di fine.

## What should happen

Gli annunci non hanno quiete né scadenze: **nessun timer li ritira**. Restano in attesa fino alla consegna o a un evento di ritiro previsto dal Modello. Il ritiro per fine lavoro segue soltanto l’hook a riposo, la fine riconoscibile del comando inviato da Trama, la chiusura del terminale oppure gli eventi della chat applicabili al progetto; non tocca gli annunci di altri terminali. I comandi di sola lettura non sono attività e non sono riferiti all’editor come tali; i segnali di vita non prorogano gli annunci.

## Fix options

### Ritirare soltanto in risposta agli eventi previsti

Eliminare il ritiro per quiete e le attività usate soltanto per prorogarlo, conservando i ritiri già associati ai segnali effettivi di fine lavoro. La sincronizzazione del titolo della Draft rimane indipendente. È il percorso più diretto: il ghost resta visibile se non arriva un segnale conclusivo, come richiesto, e non si deduce più una mancata consegna dal tempo trascorso.

### Separare la sincronizzazione dai ritiri

Separare esplicitamente la manutenzione del titolo dell’annuncio dalla gestione del suo ciclo di vita. Gli eventi conclusivi diventano l’unica via di ritiro; l’osservazione delle Draft può continuare senza cambiare la durata dei ghost. Richiede una riorganizzazione più ampia rispetto alla rimozione diretta, ma rende evidente che una modifica del titolo o una lettura non può far scadere o prorogare un annuncio.

## Where in the code

src/core/announcements.ts: QUIET_PERIOD_MS, markActivity, quietAnnouncements; extension/src/host/announcements.ts: watchAnnouncements; src/cli/main.ts: reportActivity; extension/src/host/terminal-activity.ts
