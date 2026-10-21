---
status: approved
base:
  agent-launching/drift-resolution.md: 83b57da6f5e2ad90eb6f2ea67aeea92629761253fe16e79ab9ec4b976c181684
  agent-launching/feature.md: d95742ac84a0148bfe5905e773559e0e423b4d6b233662a99936e73240edbe95
  work/drift.md: f012b43a90fd611ec3b3af6840712cfbe9baecb4bb8f1f5b5763d2f40834456d
  agent-questions/question-round.md: f6959e2c49f09283666d1a222993f4de620c76d3289c60fe9db478f7ee1c1173
  model-changes/proposal.md: 3701b234308278a74653c842d31cad26005f067dcaeec0ecc04e2774ebcf7945
  editor-panel/panel.md: ba5b711b4f6a6bb3afb3ef0442993c5c0f588ee7ef2ecd2d0a4f70277d7b915e
  requirements/rules/drift-resolution.md: 5498ca4e8121b1eadd0b03b8f7d118bc4ca2736fa910a6a89ea0eadcb3425b46
  requirements/tech/drift-resolution.md: 7513c3dab5c58eb8759fb8f963db044b612a3c67ca70697a3902376063bd1e3b
  requirements/data/agents.md: ed05b2c3aa0e00ae36b0d8e48b1286a0c051c5e48b91718e4f38975dbbb2bb84
  requirements/data/proposals.md: c89185f1e762f106fd77b4b8e190f46af7a07d55d7cf32d98c6a56d6b3f066be
  requirements/ui/work.md: c269c0929553d64509f47f23d2e5585991e619f5e132dc3ca5415f991c303839
  requirements/ui/settings-specs.md: c4cca782506d43bb853e09aaa3458cf6339c00ff89d88cf9584c54c16310f118
  requirements/quality/main.md: e0386e8340afc9e612b89f9d2a8a37a1268aaca4554c5349fe54b16b311e3826
  requirements/quality/agents.md: new
delete: []
request: 2026-10-21T10-26-29
created: 2026-10-21T08:35:23.973Z
label: Async Drift Resolver
---
# Async Drift Resolver

Funzione sperimentale Async Drift Resolver: i Drift vengono pre-elaborati alla fine del lavoro che li ha archiviati, così `Resolve` mostra subito la domanda pronta invece di aspettare l'esplorazione di un agente.

Oggi `Resolve` avvia un agente che esplora Modello e codice prima di fare la sua domanda: il developer aspetta. Con l'impostazione sperimentale `trama.experimentalAsyncDriftResolver` la domanda è già pronta al clic e la risoluzione nasce subito dalla risposta.

Decisioni dell'intervista:
- Al clic è pronta la domanda (contesto, opzioni, raccomandazione), non una risoluzione già decisa: il developer sceglie ancora fra le opzioni.
- La prepara l'agente principale dello scan, del Run o dell'import, alla fine del lavoro, con i suoi sotto-agenti; nessun lancio in più.
- Si preparano i Drift archiviati nel lavoro (sotto-agenti e advisor del Run compresi), ricorrenti compresi, tranne quelli della risoluzione `nonBlocking`.
- Nome: Async Drift Resolver, `trama.experimentalAsyncDriftResolver`, spenta per impostazione predefinita.
- Dopo la risposta il developer approva ancora la risoluzione, come oggi.
- Le modifiche per l'opzione "comportamento del codice" sono pronte come Proposal allegata al Drift, anche allegata dopo la creazione.
- La domanda pronta sta nel file del Drift, versionata.
- Scade quando cambia il testo di Modello o Requisiti sui riferimenti del Drift; il codice non conta.
- Senza domanda pronta valida `Resolve` lancia l'agente come oggi.
- Una domanda saltata resta pronta per il prossimo `Resolve`.
- La Board non mostra nessun segno per i Drift con domanda pronta.
- Dalla risposta Trama scrive e consegna da sola la risoluzione; solo con testo libero fuori da una Fix option (o se la consegna è rifiutata) lancia l'agente di risoluzione con la risposta, che non rifà la domanda.
- Le risoluzioni nate da una domanda pronta (`prepared: true`) non fermano altri `Resolve`, e nessuna risoluzione in attesa ferma il `Resolve` di un Drift con domanda pronta.
- Mentre la domanda pronta è aperta la finestra è in risoluzione come oggi (Run e `Dismiss Drift` bloccati).
- Durante un Run `Resolve` resta disabilitato, anche con la domanda pronta.
- Con l'impostazione spenta le domande pronte restano nei file ma sono ignorate.

Scelte mie, da verificare: la domanda scritta nella sezione `## Prepared question` del Drift come JSON; il campo `job` sui Drift per trovare quelli del lavoro; il comando nuovo `trama drift edit`; la risoluzione scritta da Trama con titolo `Resolve: <titolo del Drift>`; nel round, al posto del nome dell'agente, `Prepared question`; la frammentazione di `requirements/quality` in `main` e `agents`, per restare sotto i 12 KB.

## Already present
- `panel/Open/developer.SHOW_BOARD` — `extension/src/webview/shell.tsx` (tab della Board) e `navigate` in `extension/src/webview/main.tsx`
- `panel/Open/developer.SHOW_SETTINGS` — `extension/src/webview/shell.tsx` (tab `settings` con l'ingranaggio) e `mountSettings` in `extension/src/webview/main.tsx`
- `panel/Closed/developer.SHOW_SETTINGS` — `extension/src/webview/shell.tsx` e `extension/src/webview/main.tsx`, stessa navigazione all'apertura del pannello
