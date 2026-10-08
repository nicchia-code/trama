---
status: resolved
resolution: fix-code
refs:
  - requirements/rules#agent-terminal
  - agent-terminal
proposal: null
task: ep55033j
origin: null
option: 1
note: null
created: 2026-10-08T05:56:21.572Z
---
# The terminal of Run this design is named with the Proposal identity, not a short number

## What happens

Il terminale (o la finestra esterna, o la scheda) aperto da **Run this design** prende come nome l'**identità permanente** della Proposal, per esempio `w2cspsnx`, non un numero breve.

Il motivo: un design si avvia solo da una Proposal già approvata, e una Proposal approvata non è più viva, quindi per le regole generali dei numeri brevi non ha nessun numero. Il nome `P2` dell'esempio non può mai comparire.

## What should happen

Il Modello (descrizione di `agent-terminal`) e `rules#agent-terminal` dicono che, quando l'istruzione implementa i Task di un design, il terminale porta il **numero breve della Proposal** (per esempio `P2`), così il developer riconosce a colpo d'occhio cosa fa ogni terminale.

## Fix options

### Name it with the Proposal identity in the Model

Il codice resta com'è; Modello e Requisito dicono che il terminale di un design porta l'identità permanente della Proposal, l'unico nome che una Proposal approvata ha. Costo minimo: solo testo. Il nome è meno leggibile di `P2`, ma è lo stesso che il developer vede per quella Proposal chiusa.

### Use a fixed label for design runs

Il terminale di un design si chiama con un'etichetta fissa, per esempio `Design tasks`, come `All tasks`. Si cambiano Modello, Requisito e il calcolo del nome. Leggibile e sempre uguale, ma due design diversi condividono il nome, quindi un terminale libero di un design si riusa per un altro.

### Keep a number for the Proposal of a design under way

Una Proposal approvata tiene o prende un numero breve finché un suo Task è in To do o In progress, come già fanno i Task di un design. Il nome `P2` diventa possibile senza toccare la regola del terminale. Costo alto: cambiano le regole generali dei numeri brevi, la riga di comando e il pannello.

## Where in the code

extension/src/host/prompts.ts (terminalName), extension/src/host/controller.ts (launchAction), src/core/short-numbers.ts (le Proposal vive sono solo Draft e aperte)
