---
column: done
technical: false
refs:
  - question-round/Confirming skip all
  - question-round/Out of sight/developer.OPEN_PANEL
  - question-round/Out of sight/developer.RESTORE_QUESTIONS
drift: t1vzyocg
proposal: null
agent: false
created: 2026-10-05T14:36:51.928Z
---
# Fix code to match the Model: Closing the panel during the Skip all confirmation brings the confirmation back on reopen

## What happens

Se il developer chiude il pannello mentre è aperta la conferma di **Skip all**, il round va fuori vista ma la conferma resta aperta. Quando riapre il pannello, o clicca Reopen nella notifica, l'overlay riappare direttamente sulla conferma di Skip all.

Ridurre l'overlay a barra invece chiude la conferma, e al ripristino il developer torna sulla domanda o sul riepilogo.

## What should happen

Dallo stato fuori vista, riaprire il pannello o le domande riporta l'overlay **sulla domanda o sul riepilogo che mostrava**, mai sulla conferma di Skip all: chiudere il pannello, come ridurre l'overlay, lascia la conferma. Nulla è saltato finché il developer non conferma.

## Chosen option

**Chiudere la conferma quando il pannello si chiude**

Alla chiusura del pannello la conferma di Skip all si chiude come quando l'overlay si riduce a barra; risposte, bozze e posizione restano. Alla riapertura il developer ritrova la domanda o il riepilogo da cui l'aveva chiesta. Correzione piccola, nessun cambio al Modello.

## Where in the code

`extension/src/host/question-state.ts` (`applyQuestionAction`: solo `minimize` azzera `confirming`); `extension/src/host/question-session.ts` (`restore`) e `extension/src/host/controller.ts` (chiusura del pannello).
