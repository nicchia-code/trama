---
column: done
technical: false
refs:
  - agent-terminal
  - requirements/tech#agent-terminal
drift: 86xpmvtk
proposal: null
agent: false
created: 2026-10-16T11:10:07.003Z
finished: 2026-10-16T11:17:11.087Z
---
# Fix code to match the Model: La lingua dell'agente viene salvata al primo avvio

## What happens

Alla prima apertura dell'editor, se il developer non ha mai scritto una lingua, Trama salva nelle impostazioni utente la lingua del sistema, o quella dell'editor, o l'inglese. Da quel momento ogni istruzione all'agente chiede di scrivere in quella lingua, anche se il developer non ne ha mai scelta una.

## What should happen

Il Requisito dice che `trama.language` è vuota per impostazione predefinita e che, senza una lingua scelta dal developer, l'istruzione non chiede nulla sulla lingua. La lingua deve restare vuota finché il developer non la scrive.

## Chosen option

**Lasciare la lingua vuota finché il developer non la scrive**

Trama smette di scrivere la lingua rilevata nelle impostazioni alla prima apertura. Il campo resta vuoto e le istruzioni non chiedono nulla sulla lingua, come prescrive il Requisito. Chi vuole l'italiano o un'altra lingua la scrive a mano. Costo: chi contava sul rilevamento automatico lo imposta una volta a mano.

## Where in the code

extension/src/host/main.ts, funzione detectFirstStartLanguage, chiamata all'attivazione: scrive la lingua con update nelle impostazioni globali quando non ce n'è una. Il valore di default è vuoto in extension/package.json (trama.language).
