---
description: "Usa quando implementi worktree, round di worktree e multi-branch."
---
# Regole di worktree e multi-branch

## multi-branch
- Il comando dei worktree è impostato quando, tolti gli spazi agli estremi, resta del testo. Altrimenti accendere dal pannello lascia l'interruttore spento, avvisa, e non scrive `on`.
- Mancano la cartella o il file: l'interruttore è spento, senza avviso. Il file, tolto al più un a capo finale, vale `on` se acceso e `off` se spento. Ogni altro contenuto è illeggibile: l'interruttore è spento e il developer è avvisato.
- L'avviso sul file illeggibile non si ripete finché il contenuto resta quello. Si ripresenta se il contenuto cambia e resta illeggibile, oppure se il pannello si chiude e si riapre sul file ancora illeggibile.
- Se scrivere il file fallisce, lo stato mostrato non cambia e il developer è avvisato.
- `trama proposal approve` usa lo stesso stato del pannello. Acceso, una Proposal ordinaria segue la strada del worktree e gli stessi rifiuti. Spento o illeggibile, la Proposal è applicata nella cartella aperta; se illeggibile, il comando lo dice.
- Una chiave `trama.multiBranch` in un file di impostazioni non accende e non spegne l'interruttore.

## worktree-round
- L'interruttore spento lascia l'accettazione com'è oggi, nella cartella aperta.
- Spegnere l'interruttore non toglie le Proposal dal giro e non elimina i worktree. Un'accettazione fatta a interruttore spento non entra nel giro. Riaccenderlo mentre il giro è aperto fa entrare nel giro le accettazioni successive, dallo stesso commit di partenza.
- I worktree di uno stesso giro nascono dallo stesso commit. Il branch di una Proposal è `trama/<id della Proposal>`. Il worktree di merge usa il branch `trama/merge`. Le cartelle stanno fuori dall'albero di lavoro.
- Nel worktree l'agente riceve prima l'istruzione di scansione delle Feature toccate, con la frase che lega i Task a quella Proposal, e quando quel comando finisce, se sono nati dei Task, l'istruzione che esegue i Task di quella Proposal. Sono le due istruzioni già previste, nello stesso terminale, con la frase della lingua quando c'è.
- Il commit con cui Trama chiude le modifiche rimaste ha messaggio `Keep unfinished worktree changes`.
- Il controllo dopo l'unione riuscita è una sola scansione delle Feature che le Proposal unite avrebbero fatto scandire da sole, con la regola già usata dopo un'accettazione, unite senza duplicati. Non nomina una Proposal, quindi i Task non appartengono a nessun design. Parte con il launcher abituale nella cartella aperta, solo dopo che la cartella è stata aggiornata.
- Il Merge Drift ha due lati. Quello da tenere per sistemare offre due opzioni, la prima raccomandata: «Reconcile keeping every behaviour» e «Reconcile from the conflict markers». Quello da abbandonare chiude il giro. Non c'è un'accettazione di Proposal.
- Il Task di riconciliazione è un Technical Task, non legato a una Proposal. Se l'agente si ferma e non è in Done, l'unione non si riprova.
- Il Merge Drift e il suo Task non entrano nel risultato unito al branch. Se l'agente li ha committati, Trama li toglie prima di applicare l'unione.
- Una Proposal si può togliere dal giro solo mentre i worktree lavorano ancora. Durante il conflitto, la riconciliazione o l'attesa si abbandona l'intero giro, non una Proposal sola.

## proposal/In worktree
- Con l'interruttore acceso l'accettazione è rifiutata, la Proposal resta aperta e il motivo è detto, quando è un import, quando la scansione automatica è spenta, quando non toccherebbe nessuna Feature, quando il comando dei worktree non è impostato, quando la cartella non è un repository git o il worktree non si può creare, quando ci sono modifiche non committate, quando la Proposal è bloccata, o quando un giro sta già unendo, riconciliando o aspettando la cartella.
- Una Proposal richiesta da un'altra e ancora in un worktree non la sblocca: non è accettata finché il giro non l'ha unita.
- Accettare la Proposal attaccata a un Drift copia i file nella cartella aperta anche con l'interruttore acceso, e non apre un worktree.
- Togliere la Proposal dal giro si può solo prima che l'unione cominci. Rifiutarla o accettarla di nuovo mentre è nel worktree è rifiutato, dicendo che è in un worktree.
