---
column: done
technical: true
refs:
  - requirements/ui#General
drift: fk5j37ks
proposal: null
agent: false
created: 2026-10-10T14:15:26.739Z
finished: 2026-10-10T14:57:36.473Z
---
# Fix code to match the Requirements: Missing fix option message names the Drift as typed instead of by its short number

## What happens

Quando il developer lancia `trama drift resolve <id> --fix-code` senza opzione e l'input finisce prima di sceglierne una, l'errore «An option must be chosen to fix the code of Drift …» nomina il Drift **con l'argomento così come è stato scritto**. Se il developer ha dato l'identità permanente di un Drift aperto, il messaggio mostra quell'identità anche se il Drift ha un numero breve; l'intestazione del menu subito sopra mostra invece il numero breve.

## What should happen

I messaggi dei comandi nominano una scheda con il suo **numero breve** se ne ha uno, e solo altrimenti con l'identità permanente di otto caratteri. Un Drift aperto ha sempre un numero breve, quindi il messaggio deve dire per esempio «Drift D3».

## Chosen option

**Name the Drift by its short number**

Il messaggio di errore nomina il Drift come l'intestazione del menu, con il numero breve del Drift aperto. Cambio di una riga, nessun effetto su altri comandi.

## Where in the code

`src/cli/fix-prompt.ts`, il messaggio di errore quando l'input finisce senza una scelta (usa l'argomento posizionale invece del nome del Drift).
