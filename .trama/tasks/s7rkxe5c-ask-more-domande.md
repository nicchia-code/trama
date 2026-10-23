---
column: done
technical: false
refs:
  - question-round/On question/developer.ASK_MORE
  - requirements/data#question-round
drift: null
proposal: x6bguwt0
agent: false
created: 2026-10-23T09:50:00.125Z
finished: 2026-10-23T10:11:53.081Z
---
# Ask more nelle domande

Quando questo Task è finito, la domanda in vista di un round di domande aperto ha un pulsante `Ask more` che apre una chat di spiegazione su quella domanda. Il prompt e il lancio della chat stanno nel Task «Lancio di Ask more» della stessa Proposal; questo Task aggiunge il pulsante e l'azione dell'overlay e passa le domande del round al lancio.

Cosa deve valere (`question-round/On question/developer.ASK_MORE`):
- Sulla domanda in vista (`On question`) c'è un pulsante piccolo `Ask more`, variante `ghost`, icona `MessageCircleQuestion`, in alto a destra del testo della domanda; tooltip `Ask an agent about this question`, nome accessibile `Ask more about this question`. Non c'è nel riepilogo, nella conferma di Skip all né nella barra ridotta. Sempre abilitato.
- Premerlo manda l'azione `askMore` con l'`id` della domanda nel messaggio `{ type: "questions" }`. Lo stato del round non cambia: stessa domanda, scelte e testo scritto intatti, overlay in vista; l'agente che ha chiesto continua ad aspettare e non sa nulla della chat.
- L'host passa al lancio la domanda in vista per intero (testo, contesto, opzioni con descrizione e dettagli, raccomandata, multipla) e testo e opzioni delle altre domande del round, mai scelte, risposte scritte o salti; per la domanda pronta di un Drift anche l'identità del Drift. Con omp il terminale si chiama `Ask question`.
- `data#question-round`: il testo delle domande va solo nel prompt (terminale, chat di Cursor o appunti come ripiego); Trama non scrive nulla del round in nessun file.
- Testi in inglese, che non seguono `trama.language`.

Test: un test dell'overlay prova che `Ask more` manda l'azione con l'id della domanda e che l'overlay non cambia; un test dell'host prova che le domande passate al prompt non contengono risposte né scelte.
