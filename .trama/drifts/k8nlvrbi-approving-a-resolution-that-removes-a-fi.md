---
status: resolved
resolution: fix-code
refs:
  - drift/Open/proposal.APPROVED
  - requirements/rules#drift
proposal: null
task: h2gfac3k
origin: null
option: 1
note: null
resolvedBy: n92px9a1
created: 2026-10-09T18:57:05.715Z
---
# Approving a resolution that removes a fix-code Drift's Machine leaves it approved with Drifts open

## What happens

Una **risoluzione** che con i suoi stessi file toglie dal Modello l'intera Machine (o l'Actor) a cui punta un Drift della sua lista con la decisione di **correggere il codice** passa tutti i controlli: consegna e approvazione guardano il Modello di prima, dove quella Machine c'è ancora.

All'approvazione i file vengono copiati e la Proposal segnata come **approvata**; poi la correzione di quel Drift è rifiutata («its code cannot be fixed, the Drift can only be closed»). Restano:

- la risoluzione **Approved** e il Modello già cambiato;
- quel Drift **Open** senza Task di correzione, e così ogni Drift della lista che viene dopo di lui;
- i Drift prima di lui già risolti.

## What should happen

Il Modello dice che approvare una risoluzione risolve, **nello stesso passo**, ogni Drift della sua lista ancora aperto con la decisione registrata (`proposal.APPROVED` → Code to be fixed crea il Task di correzione). Un'approvazione rifiutata lascia la Proposal **Open** e dice perché.

Non esiste un'approvazione che lascia la risoluzione approvata e alcuni dei suoi Drift aperti: o tutto, o niente. Lo stesso caso, quando a togliere gli elementi era un'altra Proposal, è già stato corretto bloccando la risoluzione.

## Fix options

### Check the fix against the Model after the change

Il controllo che blocca una risoluzione con un Drift non più correggibile guarda il Modello **come sarà dopo** la risoluzione, non quello di oggi: la consegna è rifiutata e l'approvazione pure, prima di toccare qualcosa, con il motivo visibile come gli altri blocchi. Costa poco: riusa il controllo che c'è già, applicato ai file della Proposal.

### Undo the approval when a Drift cannot be resolved

L'approvazione prova prima a risolvere i Drift e, se uno fallisce, rimette i file del Modello e lo stato della Proposal com'erano. Il developer vede il rifiuto e la risoluzione resta Open. Copre anche errori futuri di altro tipo, ma costa un ripristino di file più delicato da scrivere e da provare.

## Where in the code

src/core/proposals.ts (`approveProposal` controlla `unfixableDrifts` sul Modello attuale, scrive i file e salva lo stato approvato prima di `resolveListedDrifts`; `driftListProblems` alla consegna fa lo stesso); src/core/work.ts (`fixCode`, `fixCodeRefusal`, `liveRefs`)
