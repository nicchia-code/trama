---
status: resolved
resolution: fix-code
refs:
  - requirements/ui#General
proposal: null
task: dm9vayyk
origin: null
option: 1
note: null
resolvedBy: 5mztm9sl
created: 2026-10-10T11:31:24.911Z
---
# Missing fix option message names the Drift as typed instead of by its short number

## What happens

Quando il developer lancia `trama drift resolve <id> --fix-code` senza opzione e l'input finisce prima di sceglierne una, l'errore «An option must be chosen to fix the code of Drift …» nomina il Drift **con l'argomento così come è stato scritto**. Se il developer ha dato l'identità permanente di un Drift aperto, il messaggio mostra quell'identità anche se il Drift ha un numero breve; l'intestazione del menu subito sopra mostra invece il numero breve.

## What should happen

I messaggi dei comandi nominano una scheda con il suo **numero breve** se ne ha uno, e solo altrimenti con l'identità permanente di otto caratteri. Un Drift aperto ha sempre un numero breve, quindi il messaggio deve dire per esempio «Drift D3».

## Fix options

### Name the Drift by its short number

Il messaggio di errore nomina il Drift come l'intestazione del menu, con il numero breve del Drift aperto. Cambio di una riga, nessun effetto su altri comandi.

### Drop the Drift name from the message

Il messaggio dice solo che serve scegliere un'opzione da 1 a N, senza nominare il Drift, che l'intestazione del menu ha appena mostrato. Il developer perde il nome nel testo dell'errore se l'intestazione è scorsa via.

### Allow echoing the argument in the Requirement

Si precisa nel Requisito che un messaggio può ripetere l'argomento come il developer l'ha scritto. Il codice resta com'è, ma la regola sui nomi delle schede ha un'eccezione da ricordare.

## Where in the code

`src/cli/fix-prompt.ts`, il messaggio di errore quando l'input finisce senza una scelta (usa l'argomento posizionale invece del nome del Drift).
