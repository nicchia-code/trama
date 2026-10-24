---
technical: false
refs:
  - task
  - voce-history
  - announcement/Verifying
  - requirements/tech#announcement/Verifying
  - requirements/tech#voce-history
---
# Chiusura in parallelo

La skill `trama-implement` accorcia la chiusura di una corsa: la verifica finale esegue insieme i controlli che non dipendono l'uno dall'altro e, mentre gira, un sotto-agente prepara il testo delle voci di History, che l'agente principale registra nella fase History.

Quando è fatto:
- Step 6 di `skills/trama-implement/SKILL.md`: l'agente principale lancia insieme, come processi in parallelo, i controlli del progetto che non dipendono l'uno dall'altro (test e controllo dei tipi, per esempio) e aspetta che finiscano tutti prima di giudicare la verifica; due controlli dipendono l'uno dall'altro quando uno usa ciò che l'altro produce o scrive gli stessi file, e nel dubbio girano uno dopo l'altro. Dopo una correzione rilancia insieme i controlli falliti e quelli che ne dipendono.
- Quando la corsa ha portato in Done almeno un Task senza `unchanged` e l'agente ha sotto-agenti: appena annunciato il controllo in Verifying, l'agente principale avvia un sotto-agente con le identità permanenti di quei Task e la lingua dell'istruzione. Il sotto-agente legge `trama history list --json`, `trama history show <id> --json` per le voci collegate e `trama task show <id> --json`, raggruppa per macro-funzionalità come dice lo step 8 e torna con l'elenco delle voci, ciascuna con il JSON pronto per `trama history new` o `trama history edit <id>`. Non lancia comandi che scrivono, non annuncia nulla e non tocca il codice.
- Step 8: l'agente principale passa il controllo a History come oggi, lancia i comandi con il JSON ricevuto e corregge e rilancia quelli rifiutati; se il sotto-agente non è tornato o non ha dato voci valide, scrive le voci da sé come oggi. Ogni Task portato in Done senza `unchanged` resta nominato almeno una volta.
- Le fasi del controllo (Verifying, Scanning, History) e il loro ordine non cambiano, e neppure i tempi che `trama timing` registra.
- Senza sotto-agenti, o senza Task portati in Done senza `unchanged`, la chiusura resta quella di oggi.
- Testo della skill in inglese; le skill installate nei progetti si rigenerano dalle sorgenti.
