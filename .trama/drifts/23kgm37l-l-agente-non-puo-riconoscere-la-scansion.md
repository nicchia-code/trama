---
status: resolved
resolution: fix-code
refs:
  - requirements/rules#announcement
  - requirements/rules#worktree-round
  - requirements/rules#agent-terminal
  - requirements/tech#announcement
proposal: null
task: wug4blvh
origin: null
option: 1
note: null
created: 2026-10-07T04:59:28.812Z
---
# L'agente non può riconoscere la scansione dopo l'unione né quella nel worktree

## What happens

Due scansioni ricevono un'istruzione che non le distingue da altre:
- la scansione **dopo l'unione** di un giro riceve la stessa riga di uno scan di Feature chiesto a mano, quindi l'agente intitola il controllo `Scan of Features …` invece di `Scan after merge`;
- la scansione **mirata nel worktree** riceve la stessa riga della scansione dopo un'approvazione, quindi l'agente annuncia un controllo `Scan of <Proposal>`, anche se una corsa in un worktree non ne annuncia.

Le righe sono quelle fissate parola per parola dai Requisiti, che non si possono cambiare senza contraddirli.

## What should happen

I Requisiti degli annunci dicono che lo scan dopo l'unione si intitola `Scan after merge` e che **una corsa in un worktree non annuncia controlli**. Ma `rules#agent-terminal` e `rules#worktree-round` fissano il testo esatto di quelle due istruzioni, e `tech#announcement` chiede la frase «non annunciare controlli» solo all'istruzione del worktree che dice di non scansionare, cioè quella dei Task. L'agente non ha modo di sapere in quale delle due situazioni si trova.

## Fix options

### Aggiungere una frase alle due istruzioni

Una Proposal aggiorna `rules#agent-terminal` e `rules#worktree-round`: la riga dello scan dopo l'unione dice che è lo scan dopo l'unione di un giro, quella della scansione mirata nel worktree dice di non annunciare un controllo. Poi un Task cambia le due righe. Costo: due frasi nei Requisiti e nel codice; l'agente non deve indovinare nulla.

### Far riconoscere la situazione alla skill

La skill `trama-scan` ricava da sé il caso: per esempio guarda se la cartella è un worktree di Trama, o se un giro è stato appena unito. Le istruzioni restano come sono. Costo: un controllo in più per l'agente, fragile se cambia dove vivono i worktree, e il titolo dello scan dopo l'unione resta difficile da riconoscere.

### Rinunciare ai due casi particolari

I Requisiti degli annunci lasciano che lo scan dopo l'unione abbia il titolo di uno scan di Feature e che la scansione mirata nel worktree annunci il suo controllo. Nessun cambiamento alle istruzioni. Costo: un ghost in più nella Board del progetto aperto durante la scansione del worktree e un titolo meno preciso dopo l'unione.

## Where in the code

extension/src/host/prompts.ts (buildScanPrompt, buildApprovalScanPrompt); extension/src/host/acceptance.ts; extension/src/host/agent.ts (reportRoundMerge)
