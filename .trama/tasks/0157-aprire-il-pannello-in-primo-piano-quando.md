---
column: done
technical: false
refs:
  - question-round/Not asked/agent.ASK_QUESTIONS
  - question-round/Queued/question-round.ROUND_CLOSED
  - question-round.ROUND_OPENED
  - panel/Closed/question-round.ROUND_OPENED
  - panel/Open/question-round.ROUND_OPENED
  - question-round/Asking/agent.STOP_WAITING
  - question-round/Asking/editor.DISCONNECTED
  - requirements/tech#question-round
  - requirements/tech#panel
  - requirements/ui#question-round
drift: null
proposal: "0032"
agent: false
---
# Aprire il pannello in primo piano quando un round entra in Asking e togliere la Quick Pick

Un round che entra in Asking compare nel pannello Trama invece che nella Quick Pick nativa.

Fatto quando:
- quando un round entra in Asking, sia subito sia uscendo dalla coda, il pannello si apre in primo piano sul Diagramma se era chiuso, oppure torna in primo piano tenendo la sua scheda, e riceve il round; uguale in VS Code e in Cursor;
- il pannello mostra il round sopra la scheda e manda all'host solo le azioni del developer; l'host risponde con lo stato nuovo, così un webview ricreato o un pannello riaperto mostra il round esattamente com'era;
- il testo scritto arriva all'host mentre si scrive, con un breve ritardo, e non si perde se il pannello si chiude;
- quando l'agente smette di aspettare o l'editor si perde, l'overlay (o la barra) si chiude senza consegnare risposte, come oggi per la Quick Pick;
- la coda, l'avviso ntfy sulla domanda e il segno che un round è aperto per i fantasmi della Board continuano a funzionare;
- la Quick Pick, l'input box e il resto del codice nativo delle domande non esistono più.
