---
column: done
technical: false
refs:
  - question-round/In view
  - question-round/On question
  - question-round/On question/developer.CHOOSE_ANSWER
  - question-round/On question/developer.SKIP_QUESTION
  - question-round/On question/developer.GO_BACK
  - question-round/On question/developer.OPEN_QUESTION
  - question-round/On question/developer.OPEN_SUMMARY
  - question-round/In view/developer.MINIMIZE_QUESTIONS
  - question-round/In view/developer.CLOSE_QUESTIONS
  - requirements/ui#question-round
  - requirements/ui#panel
  - requirements/tech#panel
  - requirements/tech#question-round
drift: null
proposal: "0032"
agent: false
---
# Disegnare l'overlay delle domande: intestazione, indice e domanda corrente

Il pannello mostra la domanda corrente in un overlay modale leggibile per intero, con un indice di tutto il round.

Fatto quando:
- l'overlay sta dentro il pannello, sopra qualunque scheda, con lo sfondo semitrasparente; perdere il focus non lo chiude e Esc non fa nulla;
- l'intestazione ha `Questions from the agent`, il nome dell'agente quando è noto e `Question <n> of <total>`, con i pulsanti a icona `Minimize` e `Close` (che chiede la conferma di Skip all);
- l'indice a sinistra elenca le domande con numero, testo accorciato (intero nel tooltip) e stato `Answered`, `Skipped` o `Missing` con icona e testo, evidenzia la corrente e finisce con `Summary`; sotto i 600 px diventa una riga di pallini numerati con gli stessi stati;
- la domanda è intera, con a capo; il contesto, se c'è, sta sotto in colore attenuato; domanda, contesto, descrizioni e dettagli sono Markdown con il renderer del pannello, etichette e pulsanti testo semplice;
- le opzioni sono righe cliccabili con radio o casella, numero da 1 a 9, etichetta in grassetto, descrizione intera e badge `Recommended`; `Show details`/`Hide details` per le opzioni con dettagli, chiusi a ogni visita; i tasti 1–9 scelgono l'opzione, ma non nell'area di testo;
- l'area di testo `Your answer (optional)` è sempre visibile e cresce fino a dieci righe;
- il piede ha `Back` (dalla seconda domanda), `Skip all`, `Skip` e `Next`, che diventa `Review` sull'ultima o su una domanda aperta dal riepilogo, disabilitato con tooltip finché non c'è una scelta o un testo;
- l'overlay è un dialogo accessibile con titolo, tiene il focus dentro e lo porta sul testo di ogni domanda nuova; segue il tema e rispetta il movimento ridotto; nessuna nuova libreria e nessun secondo webview.
