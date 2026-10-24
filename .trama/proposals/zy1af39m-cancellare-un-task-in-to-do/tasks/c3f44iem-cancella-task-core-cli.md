---
technical: false
refs:
  - task
  - developer.DELETE_TASK
  - requirements/rules#developer.DELETE_TASK
  - requirements/rules#developer.CLEAR_DONE
  - requirements/tech#developer.DELETE_TASK
  - requirements/tech#developer.CLEAR_DONE
  - requirements/data#developer.DELETE_TASK
  - requirements/cli#General
---
# Cancellazione Task nel core

Il developer deve poter cancellare per sempre un Task in To do, senza aspettare che arrivi in Done. Questo Task copre `src/core` e la riga di comando; il pulsante del pannello, l'host e il webview, e i testi delle skill, sono fuori da qui.

## Funzione di `src/core`

Una sola funzione di `src/core` cancella un Task in To do; la chiameranno sia la riga di comando sia l'host. Nell'istante della cancellazione ricontrolla sul Task:

- la colonna è `todo` (un Task In progress, Done o inesistente è rifiutato);
- nessun Drift `open` (non risolto, non dismesso, non unito in un altro) ha il Task in `origin`, comprese le origini di un Drift unificato;
- nessun Drift `resolved` con `resolution: fix-code` (cioè in Code to be fixed) ha il Task come `task`, così la correzione decisa dal developer non si perde e le sue origini continuano ad aspettarla.

Un Task bloccato (blocked o waiting), o che aspetta il suo Task di correzione, si cancella come gli altri. Trama non ricorda se un Task è mai partito: vale anche un Task tornato in To do dopo un Run interrotto.

Se una condizione non vale, la funzione lancia un errore che dice quale, senza cancellare nulla. Se valgono, cancella il file `tasks/<id>-<slug>.md`, il file di percentuale del Task e la cartella `.trama/task-images/<id>/`, se esistono. Non lascia segni nella cartella `tasks/` né campi nuovi nel file del Task. Non scrive copie (`cleared`) nelle voci di History che citano il Task, non aggiunge righe a `.trama/last-scan/cleared` e il Task non conta fra i Task finiti dall'ultimo scan globale. Proposal, Drift e voci di History tengono i riferimenti al Task che già contengono e lo mostrano come un Task che non esiste più (`no longer exists`); per chi aspettava la sua correzione conta come Done. Nel Modello il Task va nello stesso stato finale Cleared dei Task cancellati con Clear, e non si può riportare indietro: nessun comando lo ripristina, salvo il controllo di versione del progetto.

La cancellazione dei tre file (Task, percentuale, immagini) è la stessa di Clear e sta in un solo punto di `src/core` usato da entrambi: `clearDoneTasks` la richiama invece di averla propria, e il suo commento che dice di essere l'unico punto in cui un Task si cancella cambia, perché non lo è più. Clear per il resto non cambia: resta solo dal pannello, senza conferma e senza comando; l'unico comando che cancella un Task è `trama task delete`, solo per un Task in To do.

## Numeri brevi e design

La cancellazione libera il numero breve del Task, come per ogni scheda che non esiste più. Il design della Proposal del Task continua con i Task rimasti, e i numeri brevi seguono le regole di sempre come se il Task cancellato non ci fosse: se restano solo Task Done, li liberano tutti insieme.

## Trattenuto da un Drift, nel quadro

La stessa regola, in `src/core`, dice per ogni Task in To do del quadro (Snapshot) se un Drift lo trattiene (origine di un Drift aperto o Task di correzione di un Drift in Code to be fixed), e il quadro lo porta nella scheda del Task, così il webview non ricalcola la regola.

## Comando `trama task delete <id>`

- Accetta l'identità, un suo prefisso o il numero breve; chiama la funzione di `src/core` e stampa `Deleted Task <identità> "<titolo>".`; con `--json` stampa `{ id, title }`.
- Un rifiuto esce con un errore e un messaggio che dice perché, senza cancellare nulla.
- Non chiede conferma, non legge `--input`, e non guarda né i Run in corso né la fine del turno dell'agente.
- Funziona anche se lo lancia l'agente (`TRAMA_AGENT=1`), con le stesse conseguenze e senza rifiuti legati a chi lo lancia.
- Il suo aiuto in `src/cli/commands/task.ts` dice «Delete a Task in To do for good.».
- `docs/cli.md` descrive il comando.

La regola dei verbi della riga di comando diventa: i verbi sono sette (`show`, `list`, `new`, `edit`, `move`, `check`, `delete`); `delete <id>` cancella una scheda per sempre ed esiste solo per `task`. Nessun altro oggetto ha `delete`.

## Test

- La funzione di `src/core`: un Task in To do è cancellato con il file di percentuale e la cartella delle immagini; rifiuto per un Task In progress, per uno Done, per l'origine di un Drift aperto e per il Task di correzione di un Drift `fix-code`; nessuna scrittura nella History né in `.trama/last-scan/`.
- Il comando `trama task delete`, con l'uscita testuale e `--json`, e il rifiuto.
- I test di Clear esistenti continuano a passare con la cancellazione dei file condivisa.
