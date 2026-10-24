---
column: done
technical: false
refs:
  - omp-chat
  - omp-chat-general
  - requirements/rules#omp-chat
  - requirements/tech#omp-chat
  - requirements/ui#omp-chat
  - requirements/data#omp-chat
  - requirements/quality#omp-chat
  - requirements/rules#omp-chat-general
  - requirements/tech#omp-chat-general
  - requirements/ui#omp-chat-general
  - requirements/quality#omp-chat-conversation
  - requirements/data#omp-chat-general
drift: null
proposal: oic1xvs8
agent: false
created: 2026-10-24T16:33:23.097Z
finished: 2026-10-24T16:37:55.356Z
---
# Uso in ogni conversazione

La barra dell'uso dell'abbonamento, che oggi compare solo in General, compare in ogni conversazione della vista omp Chat: General, ogni conversazione di un lavoro (design, scan, Run, Resolve Drifts, Unify Drifts, import) e Ask more, anche ancora vuota. L'uso diventa della vista della finestra, non di General; i Requisiti dell'uso stanno ora nelle sezioni `omp-chat` di `rules`, `tech`, `ui`, `data` e `quality`, e quelle di `omp-chat-general` non ne parlano più.

Quando il Task è finito vale:

- **Dove.** La barra sta nella riga sotto il campo del messaggio di ogni conversazione, subito a destra del selettore del modello, identica a quella di General di oggi: voci con anello, nome corto e percentuale, colori alle soglie 80 % e 100 %, tooltip, pulsante compatto `Usage` con l'icona `Gauge` quando il fornitore del modello non ha dati ma altri sì, nessuna barra senza dati, e lo stesso dialogo `Usage` con ogni fornitore. Il montaggio in `conversation.tsx` non ha più nessuna condizione sul tipo di conversazione (oggi `item.general === true`), e il commento di `usage.tsx` non dice più che la barra è solo di General.
- **Quale fornitore.** Ogni barra mostra il fornitore del modello scelto nel selettore della propria conversazione (la parte dell'identità del modello prima della prima `/`): il modello attuale che omp dà alla conversazione, o in sua assenza quello con cui è partita. Cambiare modello in una conversazione cambia subito la sua barra, con l'ultimo resoconto, senza chiedere di nuovo a omp; le altre barre restano come sono.
- **Un resoconto per finestra.** Tutte le conversazioni mostrano lo stesso resoconto, uno per finestra, in memoria nell'host; il messaggio `usage` resta uno per la vista.
- **Quando chiedere a omp**, senza nessun timer:
  - quando una scheda compare o è ripresa (General con `omp-chat-general.SHOWN`, una conversazione con `omp-chat-conversation.OPENED`), solo se la finestra non ha ancora un resoconto riuscito e nessuna richiesta è in corso;
  - alla fine del turno di un agente in qualunque conversazione della vista (passaggio da `running` a un altro stato), General compresa, solo se nessuna richiesta è in corso e l'ultima richiesta, riuscita o fallita, è finita da più di 60 secondi (o non ce n'è ancora stata nessuna); una fine del turno che non chiede non mette nulla in attesa. I 60 secondi sono una costante del modulo `extension/src/host/omp-chat/usage.ts`, che tiene l'istante in cui è finita l'ultima richiesta;
  - all'apertura del dialogo dell'uso (`refreshUsage`), sempre: se una richiesta è in corso, ne aspetta al più una, che parte alla fine della precedente.
- **Anche senza General.** Una finestra senza General ma con conversazioni di lavori (omp Chat spenta con lavori ancora aperti, o conversazioni riprese con omp Chat spenta) chiede l'uso con le stesse regole: `extension/src/host/omp-chat/view-model.ts` non controlla più che la vista abbia General e chiede finché ha almeno una scheda; una finestra senza nessuna conversazione non lo chiede. `omp usage --json` gira nella cartella che vale per il pannello, la stessa di General, anche quando General non c'è.
- Resta com'è: lettura del resoconto in `src/core/omp-usage.ts`, `execFile` senza shell con 30 secondi di limite, fallimenti che lasciano l'ultimo resoconto e compaiono solo nel dialogo come `Could not refresh: <motivo>.`, nessuna email né identità di account al webview.
- **Test.** Il test del webview che oggi pretende la barra solo in General (`test/omp-chat-usage-webview.test.tsx`) prova invece la barra in General, in una conversazione di un lavoro e in Ask more, ciascuna con il fornitore del proprio modello, oltre al pulsante `Usage`, a nessuna barra senza resoconto e al dialogo con `refreshUsage` all'apertura. Un test `bun:test` dell'host prova la richiesta senza General con una sola conversazione di un lavoro, nessuna richiesta all'apertura di una conversazione con un resoconto già presente o una richiesta in corso, la fine del turno che chiede dopo 60 secondi e non prima, anche dopo un fallimento, e `refreshUsage` che chiede sempre.
- **Documenti.** Il README dice che ogni conversazione di omp Chat mostra l'uso dell'abbonamento chiesto a omp, sotto il campo del messaggio accanto al selettore (oggi dice solo General e «Above its messages»); `docs/uat.md` (Z27, Z28, Z30) descrive la barra in ogni conversazione con il fornitore del suo modello, le richieste limitate e la barra senza General; il commento del protocollo in `omp-chat-protocol.ts` non lega più l'uso a General.
