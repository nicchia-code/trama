---
column: done
technical: false
refs:
  - drift-resolution
  - developer.UNIFY_DRIFTS
  - agent-launching
  - agent-terminal
  - editor-chat
  - announcement
  - agent-questions
  - requirements/rules#developer.UNIFY_DRIFTS
  - requirements/rules#agent-terminal
  - requirements/tech#developer.UNIFY_DRIFTS
drift: null
proposal: l8md4lsg
agent: false
created: 2026-10-22T07:37:53.534Z
finished: 2026-10-22T07:44:36.469Z
---
# Lancio di Unify Drifts

Quando questo Task è fatto, l'editor sa lanciare Unify Drifts: un agente che unisce tutti i Drift aperti fuori da ogni risoluzione in un unico Drift, che il developer poi risolve con Resolve. Il Drift unificato e la sua registrazione con `trama drift new` e `unifies` sono il Task «Drift unificato nel nucleo»; la voce del menu e i badge sulla Board sono il Task «Unify Drifts sulla Board».

Che cosa deve valere:

- Il messaggio `{ type: "launch", action: { kind: "unify-drifts" } }` (nuovo tipo di `AgentAction`, validato in `extension/src/host/messages.ts`) lancia Unify Drifts. L'host ricontrolla le condizioni al clic; un rifiuto mostra il motivo con un messaggio d'errore. Un Drift è idoneo se è aperto e fuori da ogni risoluzione in scrittura o aperta (anche `prepared: true`). Unify Drifts è indisponibile, con i motivi in quest'ordine: `Drifts are being resolved` (risoluzione o unificazione in corso lanciata da questa finestra, o domanda pronta aperta), `A run is in progress`, `Proposal <id> resolving Drifts awaits a decision` (la più vecchia risoluzione in scrittura o aperta senza `prepared: true`), `Unify needs at least two open Drifts`. La Snapshot porta `unify.blockers` con tutti i motivi che valgono, calcolati in `src/core/resolution.ts` accanto a `resolveDriftsBlocker`.
- I Drift idonei si raccolgono, in ordine di creazione, solo quando l'istruzione parte davvero; se resta nella chat o negli appunti non nasce nessun lavoro e nessun annuncio resta.
- Il lavoro registra un `JobKind` `unify` che conta come una risoluzione in corso: finché dura nessun Run, nessun Resolve, nessun Rework with feedback, nessun altro Unify Drifts e nessun Dismiss Drift dal pannello parte, con gli stessi motivi di una risoluzione; finisce come una risoluzione (hook a riposo, fine del comando, chiusura del terminale, fine, interruzione o chiusura della conversazione, controllo di esecuzione). Se finisce senza aver registrato il Drift unificato, nessun Drift cambia. Tiene l'elenco dei Drift raccolti per i badge `Unifying`.
- Le istruzioni non sono una skill: sono il file `extension/media/unify-drifts.md`, incluso nel VSIX, mai installato nel progetto né in `SKILLS`. La prima riga è esattamente `Trama: Unify Drifts`. In inglese, dice all'agente di: leggere ogni Drift con `trama drift show` e il codice dei punti citati e trovare i conflitti (Drift che vogliono cose incompatibili o toccano lo stesso punto in modi diversi); solo se ci sono, fare un solo round con `trama question new`, una domanda per conflitto, con le strade e la raccomandazione, senza domande sul modo di correggere il codice e mai con il proprio strumento di domande; per una domanda saltata tenere tutte le strade come modi di correggere diversi; scrivere un solo Drift con un titolo breve, `refs` che contengono tutti quelli dei Drift uniti, un solo `happens` e un solo `should` che raccontano tutte le differenze con le scelte del developer, `where` con tutti i punti, da due a cinque modi di correggere validi per tutte le differenze (combinando le strade se fossero più di cinque), oppure nessun modo e una Proposal allegata nuova, che riprende ciò che serve delle Proposal allegate ai Drift uniti e si consegna subito dopo il Drift; registrarlo con un solo `trama drift new` con `unifies` e l'annuncio di Trama; con il Drift blocker acceso giudicare di nuovo i Task da lasciare liberi, origini comprese; con l'Async Drift Resolver acceso preparare alla fine la domanda pronta del Drift unificato; non decidere, risolvere, chiudere o scartare nient'altro, non scrivere risoluzioni; alla fine dire al developer di premere `Resolve` sul Drift unificato.
- Dopo il testo del file viene una riga: "Unify the open Drifts `a`, `b`, `c` into one Drift, following the instructions above." con le identità permanenti in ordine di creazione, seguita sulla stessa riga dalle frasi abituali di `rules#agent-terminal` nel loro ordine: limite dei sotto-agenti, Drift blocker (Unify Drifts la porta), lingua, domande.
- Con omp: terminale `Unify`, ruolo sempre `trama.analysis`, `--hook`, overlay e variabili come per Resolve Drifts; il comando è `omp … @<percorso assoluto del file> "<riga>"`, entrambi citati per la shell. Va verificato con omp 18.12, anche su Windows, che `@<file>` metta il testo del file nel primo messaggio.
- Con la chat di Cursor il messaggio è il testo del file, una riga vuota, la riga dei Drift, poi le righe di PATH e delle domande, con il percorso di consegna di sempre e `modelConfig` su `trama.analysis`. Fuori da Cursor compare l'avviso delle altre istruzioni con `Open Settings` e l'istruzione completa negli appunti. `SKILL_PROMPT` in `src/core/cursor-chat.ts` riconosce anche la riga `Trama: Unify Drifts`, così la conversazione è di Trama dal primo prompt e l'hook rifiuta lo strumento di domande dell'agente.
- Al lancio Trama annuncia il Drift unificato con `{ kind: "drift", title: "Unifying <N> Drifts" }`: il ghost tiene questo titolo, anche quando l'agente comincia la Draft da allegare, finché `trama drift new` con `unifies` non lo consegna; si ritira come ogni annuncio di Trama alla fine del lavoro.
- Test: un test dell'host, con il terminale finto, prova nome, ruolo, `@<file>` e riga del comando, il lavoro `unify` nei motivi dei pulsanti e il rifiuto con meno di due Drift; un test prova il testo consegnato alla chat di Cursor e il riconoscimento della riga fissa.
