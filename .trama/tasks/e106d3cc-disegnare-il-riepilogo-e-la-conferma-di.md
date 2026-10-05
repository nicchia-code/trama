---
column: done
technical: false
refs:
  - question-round/Reviewing
  - question-round/Reviewing/developer.OPEN_QUESTION
  - question-round/Reviewing/developer.SEND_ANSWERS
  - question-round/Confirming skip all
  - question-round/Confirming skip all/developer.SKIP_ALL_QUESTIONS
  - question-round/Confirming skip all/developer.GO_BACK
  - requirements/ui#question-round
  - requirements/rules#question-round
drift: null
proposal: a19cef66
agent: false
created: 1970-01-01T00:00:00.160Z
---
# Disegnare il riepilogo e la conferma di Skip all nell'overlay

Prima di consegnare, il developer vede tutte le risposte in un riepilogo; saltare tutto chiede sempre una conferma dentro l'overlay.

Fatto quando:
- il riepilogo elenca ogni domanda con numero, testo intero e sotto la risposta confermata: le etichette scelte, il testo scritto come testo semplice con gli a capo, `Skipped`, oppure `Missing` nel colore di avviso con un'icona;
- ogni voce ha `Edit`, che apre la domanda; confermarla o saltarla riporta al riepilogo;
- `Send to agent` è disabilitato finché manca qualcosa, con sopra la riga `Answer or skip <n> more question(s) to send.`; il riepilogo ha anche `Skip all`;
- la conferma di Skip all è un dialogo dentro l'overlay, `Skip all unanswered questions?` con `The agent will use its recommendation for each of them.` e i pulsanti `Skip all` e `Go back`, con il focus su `Go back`;
- `Go back` torna alla domanda o al riepilogo da cui la conferma era stata chiesta, senza cambiare nulla.
