---
column: done
technical: false
refs:
  - panel
  - requirements/ui#agent.UNIFY_DRIFTS
  - requirements/ui#drift-resolution/Unifying
drift: null
proposal: 1on5nedt
agent: false
created: 2026-10-27T08:00:30.579Z
finished: 2026-10-27T09:47:01.853Z
---
# Differenze nel pannello

Il pannello mostra ogni differenza di un Drift unificato con differenze, leggendo i dati da `DriftView.differences` dello snapshot (scritto da un altro Task).

**Scheda rossa.** Sulla Board la scheda rossa di un Drift unificato con differenze dice anche quante differenze sono ancora aperte: subito dopo il badge `unified` mostra un testo secondario `<K> of <N> open`, con K le differenze aperte e N tutte, che è anche la sua descrizione accessibile. Un Drift unificato senza differenze (compresi quelli scritti prima, come il Drift aperto 2pdnq92f, che contano come un'unica differenza) non mostra niente in più e resta com'è oggi.

**Dettagli.** I dettagli di un Drift unificato con differenze, sulla Board (finestra modale di `Show details`) e nel Diagramma, mostrano al posto dei due lati un blocco richiudibile per ogni differenza, in ordine. L'intestazione di ogni blocco è un pulsante che lo apre e lo chiude col mouse o da tastiera, con `aria-expanded`, e contiene: il titolo della differenza, il numero breve o l'identità permanente del suo Drift, il suo stato (`Open`, oppure la decisione: `Fix code`, `Adapt model`, `Dismissed`) e, quando la differenza è collegata ad altre, una riga `Linked to <titoli>` i cui titoli portano a quei blocchi. Un blocco aperto è espanso quando i dettagli si aprono e mostra, come i dettagli di un Drift, le due colonne di ciò che succede e ciò che dovrebbe succedere e il punto del codice, e soltanto nel Diagramma le Fix options. Un blocco deciso è chiuso quando i dettagli si aprono e mostra la decisione con l'opzione scelta, la nota e il Task di correzione, che porta alla sua scheda o ai suoi dettagli. La sezione `Unifies` segue i blocchi.

**Scheda gialla.** Nella scheda gialla di una risoluzione, un Drift unificato con differenze ha una riga per ogni differenza che la risoluzione decide: il numero breve del Drift unificato, il titolo della differenza e la sua decisione, che porta al blocco di quella differenza nei dettagli del Diagramma.

**Ghost di Unify.** Il ghost dell'unificazione in Backlog mantiene tipo `Unify`, titolo `Unifying <N> Drifts` e le fasi `Preparing` e `Writing`, ma non mostra mai `Waiting for your answers`: l'unificazione non fa domande al developer, nemmeno quando con l'Async Drift Resolver scrive il round pronto del Drift unificato.

Tutti i testi mostrati sono in inglese e non seguono `trama.language`.
