---
column: done
technical: false
refs:
  - agent-terminal
  - requirements/tech#agent-terminal
drift: 5fjobih9
proposal: null
agent: false
created: 2026-10-16T10:20:57.373Z
finished: 2026-10-16T12:30:40.956Z
---
# Fix code to match the Model: Il terminale dell'agente si apre come scheda invece che nell'area dei terminali

## What happens

Quando il developer non ha scelto dove aprire il terminale dell'agente, Trama lo apre come scheda accanto all'editor, e non nell'area dei terminali. Il terminale compare come scheda anche per chi non ha mai toccato l'impostazione di posizione.

## What should happen

Il Modello dice che il terminale dell'agente si apre nell'area dei terminali, che è la scelta predefinita, e che la scheda si usa solo se il developer la sceglie. I Requisiti dicono lo stesso: nelle impostazioni e nella scheda Settings l'area dei terminali è il valore predefinito.

## Chosen option

**Area dei terminali come predefinito in ogni punto**

Il valore predefinito dell'impostazione diventa l'area dei terminali: nello schema delle impostazioni, nella sua descrizione e nel README. Il codice apre la scheda solo quando il developer ha scelto esplicitamente l'editor. Le scelte già salvate restano com'erano. Chi non aveva mai impostato la posizione vedrà il terminale nell'area, come dice il Modello; le schede già aperte non cambiano. Costo: poche righe in tre file.

## Where in the code

extension/src/host/agent.ts, nella funzione launchAgent: la scelta asTab legge la posizione dalle impostazioni utente e apre una scheda quando il valore non è panel, quindi anche quando manca. extension/package.json, impostazione trama.terminalLocation: default editor e descrizioni che dicono editor come predefinito. extension/README.md: la riga che dice editor come predefinito.
