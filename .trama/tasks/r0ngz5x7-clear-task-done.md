---
column: done
technical: false
refs:
  - task
  - voce-history
  - developer.CLEAR_DONE
  - work
  - requirements/data#task
  - requirements/data#voce-history
  - requirements/data#developer.CLEAR_DONE
  - requirements/rules#voce-history
  - requirements/rules#developer.CLEAR_DONE
  - requirements/tech#voce-history
  - requirements/tech#developer.CLEAR_DONE
  - requirements/ui#voce-history
drift: null
proposal: 63ymkrdw
agent: false
created: 2026-10-23T19:14:38.307Z
finished: 2026-10-23T19:24:06.481Z
---
# Clear dei Task Done

Il pulsante `Clear` in fondo alla colonna Done della Board (disegnato da un altro Task) manda all'host il messaggio `clearDone` con le identità permanenti dei Task che la colonna mostra in quel momento. Questo Task realizza tutto ciò che succede dopo: la gestione del messaggio nell'host, la cancellazione in `src/core`, le copie nelle voci di History, il conteggio di `Scan System`, i lettori che tollerano un Task che non esiste più, e la vista dei Task cancellati nella History.

## Gestione di `clearDone` nell'host
- L'host non chiede conferma e non mostra un avviso di riuscita: le schede cancellate spariscono al quadro successivo.
- Mentre un Run lanciato da Trama non è finito (lo stesso stato `running` di `WindowWork` che dà `A run is in progress` a `Run all`), l'host rifiuta il messaggio con il motivo `A run is in progress` e non cancella nulla. Le altre attività dell'agente (scan, design, import, risoluzione, unificazione, Quick Task, Ask more) non fermano Clear.
- Altrimenti chiama una sola funzione di `src/core`, che ricontrolla ogni Task del messaggio. Un Task arrivato in Done dopo il quadro che il webview mostrava non è nel messaggio e resta.
- Se la cancellazione fallisce, il motivo arriva al webview come avviso in cima alla Board, chiudibile come gli altri avvisi; i Task non cancellati restano nella colonna.

## Quali Task si cancellano
Si cancella ogni Task del messaggio che è ancora Done (`column: done`), anche chiuso senza modifiche (`unchanged`), tranne quelli che un Drift aperto (non risolto, non dismesso e non unito in un altro) nomina come origine (`origin`, o una delle origini di un Drift unificato) o come Task di correzione (`task`): quelli restano in Done, e il prossimo Clear dopo la chiusura del Drift li cancella. Un Task che nel frattempo ha lasciato Done non è cancellato. Un Task del messaggio che non esiste più è ignorato.

## Ordine delle operazioni per ogni Task
1. Scrive la copia del Task in ogni voce di History che lo cita (in `tasks`), passando da un file provvisorio poi rinominato come i comandi `trama history`. La copia va nel nuovo campo di front matter `cleared` della voce: una mappa dall'identità permanente del Task a `title` (il titolo), `proposal` (l'identità della Proposal da cui nasce, o assente), `tag` (il testo del tag che la Board mostrava, o assente), `finished` (l'istante di arrivo in Done, UTC, ISO 8601, o assente) e `refs` (la lista dei riferimenti). Il campo esiste solo quando Clear ha cancellato almeno un Task citato; ogni sua chiave è anche in `tasks`, che resta invariato. Una copia già scritta non cambia più. Nessuna migrazione delle voci esistenti.
2. Se il Task ha un `finished` dopo l'istante di `.trama/last-scan/system`, aggiunge a `.trama/last-scan/cleared` una riga con l'identità permanente e il `finished`, separati da uno spazio. Il file sta nella cartella locale e non versionata `.trama/last-scan/` (con il suo `.gitignore`), nasce con la prima riga e una riga che non si legge è ignorata.
3. Cancella il file `tasks/<id>-<slug>.md`, il file di percentuale in `.trama/progress/` e la cartella `.trama/task-images/<id>/`, se esistono. Non lascia segni nel file del Task né nella cartella `tasks/`; nessuna Proposal, nessun Drift e nessun file di History perde i riferimenti al Task che già contiene. La riga del numero breve del Task sparisce come per ogni scheda che non esiste più, quindi il numero si libera.

Se una scrittura fallisce, la funzione si ferma prima di cancellare quel Task e dice quale Task e perché; i Task già cancellati restano cancellati. Un Task che non riesce a copiare non è cancellato. Un Task cancellato non torna: nessun comando lo ripristina.

## Nessun comando della riga di comando
Clear vale solo dal pannello. Non c'è `trama task clear` né un'opzione simile, e `docs/cli.md` non cambia per Clear.

## Conteggio di `Scan System`
`tasksSinceScan` della Snapshot somma ai Task ora in Done contati come prima (con `finished` dopo `system`, senza `unchanged`) le righe di `.trama/last-scan/cleared` con un `finished` dopo l'istante di `system`. Quando il lancio dello scan del Sistema riscrive `system`, l'host svuota anche `cleared`, così il numero torna a zero.

## Lettori di un Task che non esiste più
Ciò che legge un Task da un riferimento non fallisce più quando quel Task non esiste: `trama drift show` e la nota del controllo, `trama project show`, l'origine e il design di un Drift, il controllo di un Drift unificato, la correzione nel codice e i Task bloccati. Lo mostrano con la sua identità permanente e `no longer exists`; per chi aspettava la sua correzione il Task cancellato conta come Done.

## History
- `trama history edit` e ogni aggiornamento di una voce conservano `cleared` com'è, senza toccare le copie. Un Task cancellato non si può aggiungere a nessuna voce, perché non esiste più (il rifiuto esistente per un Task che non esiste resta).
- La Snapshot, per un Task citato che non esiste più, porta la copia che la voce ne conserva quando c'è (titolo, tag, `finished`, riferimenti) e la segna come cancellata con Clear.
- `trama history show <id>` stampa un Task cancellato dalla sua copia, segnato `(cleared)`; anche `--json` porta la copia. Un Task che non esiste più senza copia resta `no longer exists`.
- Nella vista History, la scheda di una voce non ha più la «i» né altri pulsanti: cliccandola in ogni suo punto, o premendo Invio o Spazio sul suo titolo, che è un pulsante raggiungibile da tastiera con il titolo come nome accessibile e tooltip `Show the Tasks of <titolo>`, si apre la modale dei dettagli della voce; sulla scheda il puntatore è la manina. Alla chiusura della modale il focus torna al titolo della voce.
- Nella sezione `Tasks` della modale, un Task cancellato con Clear compare dalla copia: pallino di Done, identità permanente, titolo, tag, data di fine e chip dei riferimenti, seguiti dal badge `cleared` con tooltip `Deleted from the Done column with Clear`. Un Task che non esiste più e di cui la voce non ha una copia compare con la sua identità e `no longer exists`.
