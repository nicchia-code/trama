---
column: done
technical: false
refs:
  - notice
  - requirements/rules#notice
drift: d6g7i53k
proposal: null
agent: false
created: 2026-10-06T18:33:25.515Z
finished: 2026-10-06T18:35:08.291Z
---
# Fix code to match the Model: Un round chiesto da un agente di Cursor fuori da una conversazione di Trama fa nascere l'avviso sulla domanda

## What happens

Con un argomento ntfy impostato, **qualunque agente della chat di Cursor** che chiede un round di domande fa nascere l'avviso sulla domanda, anche quando la sua conversazione non è di Trama: per esempio una conversazione aperta dal developer con un prompt che non nomina nessuna skill di Trama, in cui l'agente sceglie da solo di usare `trama ask`. Trama non controlla da quale conversazione arriva il round, solo che l'agente gira nella chat di Cursor. Se il developer non risponde entro dieci secondi, l'avviso parte.

## What should happen

Il Notice dice che l'avviso nasce solo per un agente che Trama ha avviato, in un proprio terminale oppure **in una conversazione della chat di Cursor che Trama riconosce come propria** (vedi l'Actor cursor-chat); con un agente avviato dal developer per conto suo non nasce nessun avviso, a meno che il suo prompt nomini una skill di Trama. Lo ripete la prima regola di `requirements/rules#notice`. La regola sul round di Cursor dice che nasce «allo stesso modo», cioè alle stesse condizioni.

## Chosen option

**Avvisare solo per i round delle conversazioni di Trama**

Il round dell'agente di Cursor fa nascere l'avviso solo se arriva da una conversazione che Trama riconosce come propria, come già accade per l'avviso sulla fine del turno. Serve un modo per legare il round alla sua conversazione (per esempio ciò che Cursor passa all'agente, o la conversazione di Trama con un turno in corso nel progetto); costa lavoro e verifica sul comportamento reale di Cursor.

## Note

ntfy verrà rimosso/rivisto, ignoriamo i suoi problemi atm

## Where in the code

extension/src/host/question-notice.ts (noticeOnQuestion, condizione su fromCursorChat); src/core/question-channel.ts (fromCursorChat ricavato solo da CURSOR_AGENT=1)
