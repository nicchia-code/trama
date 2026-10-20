---
technical: false
refs:
  - task
  - requirements/rules#agent-launching
---
# Piano parallelo

Si fa dopo i Task «Scelte parallele nella CLI» e «Casella Parallel Execution» di questa Proposal: usa `heldBack`, `timing new` e l'impostazione.

- Con `trama.experimentalParallelExecution` acceso, letto quando la corsa sta per partire, le istruzioni di implement all, di ogni Run di una sequenza per modello e del Run automatico portano, subito dopo la frase dei sotto-agenti, la frase "The experimental parallel execution is on: follow the \"Experimental parallel execution\" section of the trama-implement skill.".
  - Nessun'altra istruzione la porta.
  - Spenta, il testo delle istruzioni non cambia.
- La skill `trama-implement` ha una sezione "Experimental parallel execution", che vale solo quando l'istruzione porta la frase:
  - prima del primo Task l'agente principale chiede i Task eseguibili e quelli trattenuti con `trama task list` (`runnable`, `max`, `heldBack: true`, più i filtri della corsa);
  - legge titolo, corpo, riferimenti e Proposal di ciascuno, senza leggere il codice, e fa il piano: vie libere e ordini, ciascuno con un motivo;
  - non fa mai partire un Task bloccato, non supera N posti e non fa partire un Task prima di quelli da cui il suo ordine lo fa aspettare;
  - rivede il piano quando un Task finisce, nasce o si blocca.
- Conflitti: le istruzioni ai sotto-agenti aggiungono che un sotto-agente che vede il suo Task toccare gli stessi file o lo stesso comportamento di un altro Task in corso si ferma.
  - Non annulla le sue modifiche, lascia il Task In progress e riporta cosa ha fatto e con quale Task si scontra.
  - L'agente principale riaffida quel Task a un nuovo sotto-agente, con quel resoconto, quando l'altro è Done.
  - I sotto-agenti non correggono file di altri Task e lanciano solo i propri test.
- Ogni via libera, ordine e conflitto si registra con `trama timing new`. Il resoconto della corsa ha una sezione che li elenca.
- Senza la frase, o senza sotto-agenti, la skill fa ciò che fa oggi.
- Test: la frase c'è solo nelle corse su più Task e solo con l'impostazione accesa.
