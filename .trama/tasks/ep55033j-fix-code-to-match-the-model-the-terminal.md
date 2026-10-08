---
column: done
technical: false
refs:
  - requirements/rules#agent-terminal
  - agent-terminal
drift: cmy1mrul
proposal: null
agent: false
created: 2026-10-08T05:59:44.156Z
finished: 2026-10-08T06:15:32.517Z
---
# Fix code to match the Model: The terminal of Run this design is named with the Proposal identity, not a short number

## What happens

Il terminale (o la finestra esterna, o la scheda) aperto da **Run this design** prende come nome l'**identità permanente** della Proposal, per esempio `w2cspsnx`, non un numero breve.

Il motivo: un design si avvia solo da una Proposal già approvata, e una Proposal approvata non è più viva, quindi per le regole generali dei numeri brevi non ha nessun numero. Il nome `P2` dell'esempio non può mai comparire.

## What should happen

Il Modello (descrizione di `agent-terminal`) e `rules#agent-terminal` dicono che, quando l'istruzione implementa i Task di un design, il terminale porta il **numero breve della Proposal** (per esempio `P2`), così il developer riconosce a colpo d'occhio cosa fa ogni terminale.

## Chosen option

**Name it with the Proposal identity in the Model**

Il codice resta com'è; Modello e Requisito dicono che il terminale di un design porta l'identità permanente della Proposal, l'unico nome che una Proposal approvata ha. Costo minimo: solo testo. Il nome è meno leggibile di `P2`, ma è lo stesso che il developer vede per quella Proposal chiusa.

## Where in the code

extension/src/host/prompts.ts (terminalName), extension/src/host/controller.ts (launchAction), src/core/short-numbers.ts (le Proposal vive sono solo Draft e aperte)
