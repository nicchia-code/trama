# Requirements: Regole di business, Unify Drifts

Usa quando implementi Unify Drifts: quali Drift si uniscono, quando si può lanciare, l'istruzione all'agente, ciò che l'agente fa e le regole del Drift unificato e dei Drift uniti.

## developer.UNIFY_DRIFTS

- Un Drift è idoneo quando è aperto e non sta in nessuna Proposal di risoluzione in scrittura o aperta, comprese quelle con `prepared: true`. Unify Drifts unisce tutti i Drift idonei, nell'ordine di creazione, raccolti nel momento in cui l'istruzione parte davvero.
- Unify Drifts è indisponibile, con questi motivi in quest'ordine: `Drifts are being resolved` (un lavoro di risoluzione o di unificazione lanciato da questa finestra è in corso, o è aperta una domanda pronta), `A run is in progress` (un Run lanciato da Trama non è finito), `Proposal <id> resolving Drifts awaits a decision` (la più vecchia risoluzione in scrittura o aperta senza `prepared: true`), `Unify needs at least two open Drifts` (meno di due Drift idonei). Una scheda che aspetta la fine del turno del suo agente non conta.
- L'istruzione non nomina una skill. È il testo di istruzioni di Unify Drifts che Trama porta con sé, la cui prima riga è `Trama: Unify Drifts`, seguito da una riga sola: "Unify the open Drifts `a`, `b`, `c` into one Drift, following the instructions above." con le identità permanenti dei Drift raccolti in ordine di creazione, e poi, sulla stessa riga, le frasi di `rules#agent-terminal` nel loro ordine (limite dei sotto-agenti, Drift blocker, lingua, domande). Il testo arriva come file allegato al primo messaggio, la riga come prompt.
- Il testo delle istruzioni dice all'agente, in inglese, di:
  - leggere ogni Drift raccolto con `trama drift show` e il codice dei punti che citano, e trovare i conflitti: due o più Drift che vogliono cose incompatibili o che toccano lo stesso punto in modi diversi;
  - fare, solo se ci sono conflitti, un solo round con `trama question new`, una domanda per conflitto, con le strade come opzioni e la propria raccomandazione, senza nessuna domanda sul modo di correggere il codice; mai con il proprio strumento di domande;
  - per una domanda saltata, non usare la raccomandazione: tenere tutte le strade del conflitto come modi di correggere diversi;
  - scrivere un solo Drift: un titolo breve; `refs` che contengono tutti i riferimenti dei Drift uniti; un solo `happens` e un solo `should` che raccontano tutte le differenze, con le scelte del developer; `where` con tutti i punti del codice; da due a cinque modi di correggere il codice che valgono per tutte le differenze insieme, il primo raccomandato, combinando le strade se sarebbero più di cinque; oppure nessun modo e una Proposal allegata quando nessuna correzione del codice può rispettare Modello e Requisiti;
  - quando serve una Proposal allegata, cominciarne una nuova, che riprende ciò che serve delle Proposal allegate ai Drift uniti, e consegnarla subito dopo il Drift, come per ogni Drift con Proposal;
  - registrarlo con un solo `trama drift new` con `unifies` e l'annuncio di Trama; con il Drift blocker acceso giudicare di nuovo i Task da lasciare liberi; con l'Async Drift Resolver acceso preparare la domanda pronta del Drift unificato alla fine;
  - non decidere, risolvere, chiudere o scartare nessun Drift o Proposal in altro modo, non scrivere una risoluzione e non lanciare Resolve; alla fine dire al developer di premere `Resolve` sul Drift unificato.
- Il lavoro di unificazione conta come un lavoro di risoluzione per ogni esclusione di `rules#drift-resolution`: finché è in corso nessun Run, nessun Resolve, nessun Rework with feedback, nessun altro Unify Drifts e nessun Dismiss Drift dal pannello parte, con gli stessi motivi. Finisce come un lavoro di risoluzione.
- Se l'istruzione non parte davvero non nasce nessun lavoro, nessun annuncio resta e nessuna scheda è segnata.

## agent.UNIFY_DRIFTS

- `trama drift new` con `unifies` registra il Drift unificato. È rifiutato, senza scrivere nulla e nominando ogni problema, quando: `unifies` ha meno di due Drift o un Drift ripetuto; un Drift nominato non esiste, non è aperto o sta in una Proposal di risoluzione in scrittura o aperta; `proposal` nomina una Proposal allegata a uno dei Drift uniti; c'è anche `task` o `previous`, che con `unifies` calcola Trama; una qualunque altra regola di un Drift nuovo non vale.
- Le origini del Drift unificato sono le origini dei Drift uniti, senza doppioni, nell'ordine di `unifies`. I precedenti sono i precedenti dei Drift uniti, più ogni Drift di cui un'origine è il Task di correzione, senza doppioni, nello stesso ordine. Il Drift è ricorrente se ne ha almeno uno.
- `notBlocking` vale come per ogni Drift nuovo: ogni Task nominato dev'essere un Task che il Drift unificato bloccherebbe, origini comprese.
- Nello stesso passo ogni Drift unito diventa `resolved` con `resolution: unified` e ricorda il Drift unificato; perde il numero breve; i Task che bloccava li blocca ora il Drift unificato; la sua domanda pronta non vale più; la Proposal allegata, in scrittura o aperta, è scartata senza feedback.
- Un Drift `unified` non conta fra i Drift già risolti quando si decide se registrare una differenza, non può essere il `previous` di nessun Drift e rifiuta ogni `drift move`, come ogni Drift chiuso.
- Correggere il codice di un Drift con più origini rimanda in To do ogni origine non Done, che aspetta il Task di correzione; accettare la Proposal o chiudere il Drift lascia ogni origine dov'è.
- Il modello scelto per una Proposal vale per Resolve su un Drift unificato solo se tutte le sue origini appartengono a quella Proposal.
