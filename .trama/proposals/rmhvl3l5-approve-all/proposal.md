---
status: open
base:
  actors/developer.md: b735b01e74ae75abfffd4aafc0c969906bc6df3b58a8f0c43e7263dacc2efe3e
  agent-launching/feature.md: 9e7c34a4a169dd383000a3dc7d7aef559eaa39cf20127dd87b63d335c671ebd2
  agent-launching/raffinamento.md: a76aed8b49b4a951707b80f032e3c06b547150bb9374a507bf08098387f0fc88
  editor-panel/panel.md: 905349caebf6128d4aee39a49b099bd726ba097ac846e29e54416b5b5b0f0180
  model-changes/proposal.md: 755511a076ea79bae37e71cfd97c7e831c5ae47eec2a2f3329f09834b35d60f7
  requirements/ui/raffinamento.md: 3cfa2bafc126e041022e25d2c4bfc0ea15e2a7aa30e9b37753145f1845a4d036
  requirements/ui/board.md: 8466bba9f0def2fc5105aadbbd1e75ef1b463bae2ddd7fdb1a18e390f0ad0ab9
  requirements/ui/panel.md: f801c6231f37123f100287f3b3add29c9e4697f5bad6cf8e6117b3d48d3d5307
  requirements/ui/general.md: ae5dc565e37a76a051d2fb325c2999f70ca838028bfaf5c330eb3f66fe4c537e
  requirements/ui/unify-drifts.md: 6a7f141bbcb85d160dd558ba232ca0a662b7e31ddcc9b0798901f72823e2d8b2
  requirements/rules/raffinamento.md: 0afebd1fbc2912c47a465a9ad72793d9ff883216dc1f80f7575755257df55a87
  requirements/rules/decisions.md: 39290bf2f9511349e64e37e92986cb616e659fc0ea302cd0d5af39174bc9af01
  requirements/tech/raffinamento.md: bd2f3d6fc6e867f84811d5c3831e2515828c631babddbe9572fb083c25cc86e3
  requirements/tech/unify-drifts.md: 33b46f0f476e6fcba644719ba97ea5beb1c3318d9d0f94da3a4ecb87f1ca5d38
  requirements/data/raffinamento.md: 2dd6be4ca5bebed04bae543c1119d44f5865ae1b130376a30cc1543ef55da1df
  requirements/quality/raffinamento.md: 65ab3bea975b487dc09e8be28dcf4749d6905711f32e8dc21eca4078fd6d5f85
  requirements/rules/approva-tutte.md: new
delete: []
request: 2026-10-24T18-33-36
created: 2026-10-24T16:40:05.476Z
label: Approve All
---
# Approve All

Refine All, nel menu della freccetta di + Add Work Item, diventa Approve All: fa tutto ciò che faceva (mette in coda e raffina le Proposal da raffinare, poi le approva) e in più approva subito le Proposal che si possono già approvare. Una cosa in più, non in meno.

## Decisioni
- Etichette: `Approve All (<n>)` e, mentre la coda ha Proposal che aspettano, `Cancel Approve All`. Gli Eventi diventano `developer.APPROVA_TUTTE` e `developer.ANNULLA_APPROVA_TUTTE`.
- Approva direttamente ogni Proposal in Backlog il cui Approve sarebbe disponibile: design, import, setup e risoluzioni.
- Con Auto-update Stale Proposals spenta resta disponibile e approva soltanto; le Proposal obsolete restano obsolete.
- Con un Run di questa finestra in corso prende lo stesso le Proposal approvabili: aspettano la fine del Run con il badge `waiting for the run` e Trama le approva alla fine; Cancel Approve All non le toglie.
- Ordine: Backlog, prima le Proposal richieste; ogni Proposal si ricontrolla subito prima di approvarla. Una Proposal resa obsoleta da un'approvazione dello stesso clic va in coda per il raffinamento con l'impostazione accesa; con l'impostazione spenta resta obsoleta.
- Una Proposal approvabile che richiede una Proposal da raffinare (o già in coda, in raffinamento o in attesa del Run) è presa: aspetta in coda, ed è approvata quando le richieste sono approvate, oppure raffinata se nel frattempo è diventata obsoleta.
- Un'approvazione rifiutata non ferma le altre: la Proposal resta Open e la Board mostra `Trama: <numero breve> was not approved: <motivo>.`, uno per Proposal.
- Nessuna conferma; l'etichetta mostra un solo totale.
- Descrizione accessibile `Approve every Proposal that can be approved; refine stale design Proposals first, then approve them`; unico motivo di indisponibilità `No Proposal to approve`; descrizione di Cancel Approve All `Take every waiting Proposal out of the queue`.
- Approve di una Proposal in coda, per raffinamento o per approvazione, è disabilitato con il motivo `Already queued`.

## Assunzioni dell'agente
- Il `Cancel` sulla scheda di una Proposal in coda ha tooltip e nome accessibile `Take <numero breve> out of the queue`, come la descrizione di Cancel Approve All, anche per le Proposal in coda per il raffinamento.
- Una Proposal presa da Approve All senza raffinamento che aspetta la fine di un Run ha il badge `waiting for the run` con tooltip `Trama approves it when the run in progress ends`.
- L'approvazione di una Proposal che finisce di aspettare (fine del Run o Proposal richieste approvate) è il nuovo Evento `raffinamento.APPROVAZIONE_PRONTA`; la coda la approva senza agente e senza posti.
- Le regole di Approve All stanno in un frammento nuovo, `rules/approva-tutte`, perché `rules/raffinamento` avrebbe superato 12 KB.
- Gli Eventi rimossi `developer.RAFFINA_TUTTE` e `developer.ANNULLA_RAFFINA_TUTTE` generano all'approvazione il Task di rimozione del codice dell'Actor `developer`: il codice di Refine All si sostituisce, non si toglie e basta.
