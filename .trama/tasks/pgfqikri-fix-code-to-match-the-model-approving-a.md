---
column: done
technical: false
refs:
  - proposal/Open/developer.APPROVE_PROPOSAL
  - requirements/rules#drift
drift: w200qrg2
proposal: null
agent: false
created: 2026-10-09T12:16:31.463Z
finished: 2026-10-09T12:18:09.243Z
---
# Fix code to match the Model: Approving a resolution can leave it approved with its Drifts still open

## What happens

Una risoluzione aperta che sceglie di **correggere il codice** di un Drift può essere approvata dopo che un'altra Proposal approvata ha tolto dal Modello tutti gli elementi a cui quel Drift punta (la consegna li aveva trovati ancora lì, e una risoluzione senza file non diventa superata).

L'approvazione allora si **ferma a metà**: copia i file e segna la Proposal come approvata, poi rifiuta la correzione con un errore («its code cannot be fixed, the Drift can only be closed»). Il risultato è una risoluzione **Approved** con il suo Drift ancora **Open** e senza Task di correzione; gli altri Drift della lista dopo quello restano aperti anch'essi.

## What should happen

Il Modello dice che una risoluzione passa da Open ad Approved solo se non è bloccata e che, **nello stesso passo**, risolve ogni Drift della lista ancora aperto secondo la decisione registrata (`rules#drift`); un'approvazione rifiutata lascia la Proposal **Open** e dice perché.

Non esiste un'approvazione che lascia la risoluzione approvata e i suoi Drift aperti: o tutto, o niente.

## Chosen option

**Block the resolution while a fix cannot be applied**

La risoluzione conta come **bloccata** finché un Drift con `fix-code` non ha più elementi del Modello: l'approvazione è rifiutata prima di toccare qualcosa, la Proposal resta Open e il motivo si vede sulla Board e nel Diagramma, come per una Proposal superata o non valida. Il developer la fa riscrivere a Resolve Drifts. Costa un motivo di blocco in più da mostrare.

## Where in the code

src/core/proposals.ts (`approveProposal` salva lo stato approvato prima di `resolveListedDrifts`; `approvalBlock` non guarda la lista dei Drift); src/core/work.ts (`fixCode`, `fixCodeRefusal`)
