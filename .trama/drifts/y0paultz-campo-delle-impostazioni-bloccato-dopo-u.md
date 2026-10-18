---
status: resolved
resolution: fix-code
refs:
  - panel/Settings
proposal: null
task: ujifvjq9
origin: null
critical: false
option: 1
note: null
resolvedBy: mbypifu4
created: 2026-10-17T20:47:01.305Z
---
# Campo delle impostazioni bloccato dopo una modifica annullata

## What happens

Quando il developer scrive in un campo di testo o numerico delle impostazioni e poi riporta il testo al valore salvato, il campo smette di ricevere i valori dalle impostazioni: un nuovo valore arrivato dopo, per esempio da un'altra finestra o dal file delle impostazioni, non compare nel campo finché il developer non lo cambia di nuovo. Il campo dei modelli, invece, si sblocca appena lo si lascia.

## What should happen

Il Modello (stato Settings, evento editor.SETTINGS_CHANGED, ereditato da Open) dice che la scheda mostra subito i nuovi valori, anche quando è nascosta, e che non sovrascrive solo un campo che il developer sta scrivendo e non ha ancora confermato. Un campo riportato al valore salvato non è più in scrittura: il comportamento attuale non segue il Modello, e niente impedisce di seguirlo.

## Fix options

### Sbloccare il campo quando lo si lascia

Il campo torna a ricevere i valori delle impostazioni appena perde il fuoco, come già fa il campo dei modelli. Un testo cambiato è comunque inviato dal suo evento di cambio prima della perdita del fuoco, quindi nulla di scritto si perde. Costo: un ascolto della perdita del fuoco in più per i campi di testo e numerici, con lo stesso comportamento del campo dei modelli.

### Confrontare il testo con il valore salvato

Il campo resta protetto solo finché il testo scritto è diverso dall'ultimo valore ricevuto dalle impostazioni. Tornato al valore salvato, il campo si sblocca subito, anche prima di perdere il fuoco. Costo: ogni campo di testo e numerico ricorda l'ultimo valore ricevuto e lo aggiorna a ogni messaggio delle impostazioni.

### Un'unica gestione per tutti i campi di testo

I campi di testo delle impostazioni e il campo dei modelli usano la stessa funzione per il flag di modifica, con lo sblocco alla perdita del fuoco. Il comportamento è lo stesso in ogni campo e il caso non torna. Costo: un ritocco al modulo condiviso con la Board, da provare anche con i suggerimenti dei modelli.

## Where in the code

extension/src/webview/settings/index.ts, funzione inputControl (righe 156-171): l'ascolto di input alza il flag di modifica e solo change lo abbassa. Confronta extension/src/webview/model-field.ts, righe 52-55, dove il campo dei modelli lo abbassa anche alla perdita del fuoco.
