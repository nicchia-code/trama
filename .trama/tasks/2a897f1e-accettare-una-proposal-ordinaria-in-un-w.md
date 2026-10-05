---
column: done
technical: false
refs:
  - proposal/Open/developer.APPROVE_PROPOSAL
  - proposal/Open/drift.PROPOSAL_ACCEPTED
  - proposal/In worktree
  - worktree-round/No round/developer.APPROVE_PROPOSAL
  - worktree-round/In progress/developer.APPROVE_PROPOSAL
  - requirements/rules#proposal/In worktree
  - requirements/rules#worktree-round
  - requirements/data#worktree-round
  - requirements/tech#worktree-round
  - requirements/ui#worktree-round
  - requirements/quality#worktree-round
drift: null
proposal: b4ce3d0d
agent: false
created: 1970-01-01T00:00:00.170Z
---
# Accettare una Proposal ordinaria in un worktree quando il multi-branch è acceso

Con l'interruttore multi-branch spento, accettare una Proposal copia i file nella cartella aperta come oggi. Acceso, una Proposal ordinaria entra in un worktree e il giro ricorda il branch e il commit di partenza. Il giro non è un file del repository: Trama lo riconosce dai worktree e dalle cartelle sorelle.

Fatto quando:
- `trama.multiBranch` è un booleano del solo progetto, default spento; un valore utente non lo accende. La descrizione dice che, acceso, accettare una Proposal ordinaria la esegue in un worktree e che il default è spento.
- `trama.worktreeAgent` è una stringa solo delle impostazioni utente, default vuoto, con `{prompt}` come in `trama.agentCommand`. Se la chiave manca, Trama la scrive vuota senza cancellare un comando già impostato. La descrizione dice che è il comando del terminale dei worktree e che, vuoto, impedisce l'accettazione con l'interruttore acceso.
- L'accettazione apre il worktree solo se la Proposal è un cambiamento ordinario, la scansione automatica è accesa, tocca almeno una Feature ancora esistente, il comando dei worktree è impostato, la cartella è un repository git su un branch senza modifiche non committate, il worktree si può creare, la Proposal non è bloccata e il giro non sta già unendo, riconciliando o aspettando.
- Il worktree nasce dal commit in testa al branch aperto. Le Proposal dello stesso giro nascono tutte da quel commit. Il branch è `trama/<id>`. La cartella sta fuori dall'albero di lavoro: `<cartella padre>/<nome del repository>.trama-worktrees/<id>`.
- I file della Proposal sono applicati solo lì. La cartella aperta non cambia. La Proposal esce da To decide e non conta come accettata per chi la richiede.
- Se una condizione manca, la Proposal resta aperta e il developer vede l'avviso previsto: `Import proposals cannot be accepted while multi-branch is on.`; `Turn automatic scan on, or turn multi-branch off, before accepting this Proposal.`; `This Proposal affects no Feature, so multi-branch cannot start a worktree.`; `Set trama.worktreeAgent in your user settings before accepting a Proposal with multi-branch on.`; `Commit or stash your changes before accepting a Proposal with multi-branch on.`; `This folder is not a Git repository, so a worktree cannot be created.`; `A worktree round is already merging. Wait until it finishes.`; oppure il motivo di git se il branch `trama/<id>` esiste già o il worktree è rifiutato.
- Accettare la Proposal attaccata a un Drift della cartella aperta copia i file lì anche con l'interruttore acceso, e non apre un worktree.
