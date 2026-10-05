---
status: approved
base:
  actors/developer.md: 17ea0ff9397e3838505e9adc66882b23fb477c5b226fe9f59e3b6aea030f5210
  actors/workspace.md: 1a23e4f75a728011f0afcc770b296106180dad7b2c57fd73caa915fb190ad8db
  model-changes/proposal.md: e3fc2fc2c3192afcc9a51cea4852e100c8a188561c717fcc6d3d3224e2eda56a
  model-changes/feature.md: 3ac963c3f14f503cacd3c72aa62baf4b1bebe6c551a85c946ba2bd05bf21bee1
  agent-launching/feature.md: c491061cb13809bc122b59857cca138b40a06fda2bd1d7167eaedde474674ccf
  agent-launching/agent-terminal.md: f5643ed081c258a1ef85834e2822d526e55c44ec3c6e50558b797f811508be7f
  agent-launching/worktree-round.md: new
  work/task.md: 09c207fc42ad78a7ecdcec8cec1cb5aaf1585d1c18fe480ef14e372dbcf30e21
  work/drift.md: b8ae01a7f2b3d0074f3d042086486a73a3201177a54ade07d5ec65110141cf83
  work/feature.md: e508073ee72ec7be93dc23653d15f0cc0a3c0988804acf27157fdb7d2dc8b1a8
  editor-panel/panel.md: 9eaf7687dffcdf83c8c03bf1e66751628f5b5112efb90c99b940116f4e877b7e
  system.md: a5028810acfde83a0a57a47eb117b09baf309bdc9b0c0977313f74739ab34585
  requirements/ui.md: 168175cd839e7dd42cf8b83ccb533a471121ffc56f69d70168dac71a9d98b3ad
  requirements/tech.md: 73184aa21d0acd43668b6da2e33817ed5d7cde5b232d7373f2e4746a8da6829b
  requirements/rules.md: 2122af4e1c23acf68c9135ab48ca13dd09982b69d61514fff7d73a89da5e28d6
  requirements/data.md: c0786f5e9280d17dcab2b898d4675a026a600d1781fb5e7883a4d95dfb4ce1f5
  requirements/quality.md: b334fc99540e64ff13c41af1393013449c62fe4679e940822e72ffdaeb95a0fa
delete: []
request: 2026-10-04T19-57-44
---
# Run accepted proposals in parallel worktrees

Il lavoro dopo l'accettazione di più Proposal si pesta i file perché tutto avviene nella stessa cartella. Con un interruttore per progetto, ogni Proposal ordinaria accettata gira in un worktree nato dal branch corrente; alla fine Trama li unisce e controlla solo le Feature toccate.

Decisioni:
- Un worktree per Proposal accettata: scansione e Task di quella Proposal, in sequenza, lì dentro.
- Interruttore spento di default, solo di questo progetto. Spento, accettare aggiorna il modello nella cartella aperta come oggi.
- Il comando dell'agente dei worktree è un'impostazione utente, non del progetto. Se è vuoto, l'accettazione è rifiutata e il developer è avvisato: non si parte.
- I worktree nascono dal branch attualmente in uso. Se ci sono modifiche non committate, non si parte e si avvisa.
- Il modello della Proposal è applicato solo nel worktree. Il branch aperto non cambia fino al merge. La Proposal esce da To decide.
- Un giro raccoglie tutte le Proposal accettate mentre un'altra è ancora nel suo worktree. Il merge aspetta che ogni Task del giro sia in Done. Una Proposal che ne richiede una ancora nel worktree non si può accettare.
- L'agente del worktree è un terminale in quella cartella: prima la scansione già prevista, poi l'esecuzione dei Task di quella Proposal.
- I Drift e i Task dei worktree si decidono sulla Board del progetto aperto; la decisione è scritta nel worktree e Trama rilancia l'agente.
- Si può togliere una Proposal dal giro: il worktree si elimina e lei torna da decidere. Se il worktree sparisce da solo, stesso esito, e le altre continuano.
- A Task tutti in Done, Trama committa ciò che è rimasto e prova il merge in un worktree a parte. Senza conflitti, aggiorna il branch solo quando la cartella aperta è di nuovo quel branch, pulita; altrimenti aspetta e avvisa.
- Con i conflitti non unisce nulla: un Merge Drift, uno per il giro, concettualmente un Drift. Si riconcilia con un Task in quel worktree, e a Task Done si riprova; oppure si abbandona il giro. In qualche modo va risolto.
- Riuscito il merge, i worktree si eliminano. Il controllo è una scansione sola delle Feature che le Proposal unite avrebbero fatto scandire, con l'agente di sempre nella cartella aperta. I Task di quel controllo non appartengono a nessuna Proposal.
- Un import, la scansione automatica spenta, o una Proposal che non tocca nessuna Feature: l'accettazione è rifiutata finché l'interruttore è acceso.
- Il giro non è scritto nel repository: la Board lo ricava dai worktree.

Scelte da verificare:
- L'interruttore si chiama `trama.multiBranch`, scope del progetto, default spento. Il comando si chiama `trama.worktreeAgent`, scope utente, default vuoto; se la chiave manca nelle impostazioni utente, Trama la scrive vuota.
- Il branch di una Proposal è `trama/<id>`. La cartella del worktree sta fuori dall'albero di lavoro. Il merge usa il branch `trama/merge`.
- Il commit con cui Trama chiude i conti ha messaggio `Keep unfinished worktree changes`.
- Il Merge Drift si risolve in due modi, come i due lati di un Drift: riconciliare (nasce il Task) o abbandonare il giro. Non ha un'«accetta la Proposal».
- Se l'agente del Task di riconciliazione si ferma senza portarlo in Done, il giro resta fermo: non si riprova il merge, e si può abbandonare.
- I testi mostrati restano in inglese, come il resto dell'interfaccia.
- Accettare la Proposal attaccata a un Drift resta nella cartella aperta, anche con l'interruttore acceso: il codice che si tiene è quello già lì.
- Una nuova accettazione è rifiutata mentre il giro sta già unendo, riconciliando o aspettando la cartella.
- Togliere una sola Proposal si può solo prima dell'unione. Dal conflitto, dalla riconciliazione e dall'attesa si abbandona l'intero giro.
- L'interruttore si legge solo dal progetto, non da un valore utente.
