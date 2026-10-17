---
status: resolved
resolution: fix-code
refs:
  - agent-terminal
  - requirements/tech#agent-terminal
proposal: null
task: uk4fmoow
origin: null
critical: false
option: 1
note: null
resolvedBy: p8if1f0f
created: 2026-10-16T10:30:09.431Z
---
# La lingua dell'agente viene salvata al primo avvio

## What happens

Alla prima apertura dell'editor, se il developer non ha mai scritto una lingua, Trama salva nelle impostazioni utente la lingua del sistema, o quella dell'editor, o l'inglese. Da quel momento ogni istruzione all'agente chiede di scrivere in quella lingua, anche se il developer non ne ha mai scelta una.

## What should happen

Il Requisito dice che `trama.language` è vuota per impostazione predefinita e che, senza una lingua scelta dal developer, l'istruzione non chiede nulla sulla lingua. La lingua deve restare vuota finché il developer non la scrive.

## Fix options

### Lasciare la lingua vuota finché il developer non la scrive

Trama smette di scrivere la lingua rilevata nelle impostazioni alla prima apertura. Il campo resta vuoto e le istruzioni non chiedono nulla sulla lingua, come prescrive il Requisito. Chi vuole l'italiano o un'altra lingua la scrive a mano. Costo: chi contava sul rilevamento automatico lo imposta una volta a mano.

### Mostrare la lingua rilevata come suggerimento

Trama continua a rilevare la lingua del sistema alla prima apertura, ma non la scrive nelle impostazioni: la mostra nella descrizione di `trama.language` come valore consigliato. Il campo resta vuoto finché il developer non copia il suggerimento. Costo: un passo in più per chi voleva il rilevamento automatico, e la descrizione dell'impostazione va riscritta.

## Where in the code

extension/src/host/main.ts, funzione detectFirstStartLanguage, chiamata all'attivazione: scrive la lingua con update nelle impostazioni globali quando non ce n'è una. Il valore di default è vuoto in extension/package.json (trama.language).
