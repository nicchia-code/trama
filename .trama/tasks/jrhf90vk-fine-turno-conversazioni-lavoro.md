---
column: done
technical: false
refs:
  - omp-chat-conversation
  - omp-acp.TURN_ENDED
  - requirements/tech#omp-acp.TURN_ENDED
  - requirements/tech#omp-chat-conversation/Waiting for the window
drift: null
proposal: ijuvpwzo
agent: false
created: 2026-10-24T18:27:29.608Z
finished: 2026-10-24T18:29:47.060Z
---
# Fine turno in omp Chat

Con omp Chat accesa, l'auto exit oggi non scatta per Design, Setup, rifacimento di una Proposal e Import: `OmpConversations.attach` (`extension/src/host/omp-chat/conversations.ts`) ascolta `session.onTurnEnd` solo quando la conversazione ha un `job`, e quei lanci (`DesignRequests.deliver` in `extension/src/host/design-requests.ts`, `Controller.launchAction` in `extension/src/host/controller.ts`) chiamano `launchAgent` senza `job`; con `TRAMA_ACP=1` l'hook non manda più il riposo, quindi la fine del turno non arriva mai.

Quando il Task è finito:

- Ogni conversazione con l'hook di Trama è una conversazione di un lavoro, decisa dal campo `hook` e mai dalla presenza di `job`: design, Setup, rifacimento, import, scan, Run, Resolve Drifts, Unify Drifts e raffinamento. Ask more e General non lo sono.
- Per ognuna, la risposta di omp al prompt del lavoro è `omp-acp.TURN_ENDED`: con `trama.autoExit` acceso Trama ferma il processo e la conversazione sparisce dalla vista; con `trama.autoExit` spento passa ad Agent idle. In entrambi i casi finiscono il lavoro, i Task presi e gli annunci (il ghost di design e import sparisce), con l'avviso in cima alla Board per un motivo anomalo.
- `OmpConversations.followsJob` risponde per ogni conversazione con l'hook in Agent running, così le schede consegnate da design, Setup, rifacimento e import aspettano la fine del turno come quelle degli altri lavori.
- Chiusura della finestra, ripresa e voci salvate illeggibili trattano ogni conversazione con l'hook allo stesso modo, con o senza `job`; dove c'è un `job` lo finiscono anche.
- Quando `session/prompt` risponde e restano richieste di permesso senza risposta (`OmpSession.run` in `extension/src/host/omp-chat/client.ts`), l'host le chiude come annullate e le toglie dalla vista; i messaggi del developer trattenuti dietro di loro partono subito come `session/prompt` di un turno nuovo, nell'ordine in cui sono stati scritti, e la fine del lavoro è la risposta all'ultimo di quei turni. Nessun messaggio si perde e nessun turno finito resta senza la sua fine.
- Una conversazione di Ask more (senza hook) salvata come `running` riprende dopo una ricarica in Agent idle: nessun messaggio fisso della ripresa, nessun `work`, voce salvata `idle`. Una conversazione di un lavoro che lavorava riprende in Agent running con il messaggio fisso, come oggi.

Test `bun:test`: la fine del turno di una conversazione con hook e senza `job` la chiude con l'auto exit acceso e la porta a riposo con l'auto exit spento; un turno che finisce con una richiesta di permesso aperta e un messaggio trattenuto manda quel messaggio in un turno nuovo e dà la fine del lavoro dopo di lui; la ripresa di Ask more salvata `running` finisce a riposo senza prompt.
