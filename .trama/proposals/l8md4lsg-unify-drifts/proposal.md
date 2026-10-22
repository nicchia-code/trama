---
status: approved
base:
  actors/developer.md: faf81831c35edc28d21dfed335092341220b361236490826043b49e243f3c580
  actors/agent.md: ccf2f35f5a0d7c28ed4c71ff5c570695d39dfa645aec286d4b64ee756e4caa0d
  actors/editor-chat.md: 1f0d5c3e155fa7435244b279eec550562f0a8570d7abe150bd5dc3583afbefac
  work/drift.md: 211c1074cc096ad93d960916e3d73e59d49b9b904ffa1e9ea40b2e2aee58ca24
  agent-launching/drift-resolution.md: 126d08e12a93f2ec9247fe9c72451448f9275c71300ff98e820e00aeaabdc3a8
  agent-launching/feature.md: 6eb6728970475f9c209e59e992eb8f08f3fb2da3bb1424e80eb4148a07a167de
  editor-panel/panel.md: abb0f54f179918c29c86e558cb40879087a6ff491b4e2dd2f7283be9e944e3ee
  work/announcement.md: dd78f5c587e66954884a0aff0bf99a50723eeb678d768711b2de6be6f1f83b32
  requirements/ui/quick-task.md: 69847cfc7f1e87e9297a669e7eec60a45c1c4acb71bef23ae2b5174a73bffa15
  requirements/tech/quick-task.md: d905724dd43959ad7389a18fa1af554a7a8c699cd6a565a21dba7dbbaec0b0da
  requirements/rules/agent-terminal.md: ebf86993d70cf954d1faf0c1e7180e5911e3f0e739db32b291aa716b803ff685
  requirements/data/work.md: 08fb6286d4cacf78596be14b9d9ef34fed277c05c6f24d34dad404acdc32587a
  requirements/cli/main.md: b823d27e5547f43bdcb3f69eb0e34c4be5d8f79c8d8cfe78500248a90f6f7d60
  requirements/ui/unify-drifts.md: new
  requirements/tech/unify-drifts.md: new
  requirements/rules/unify-drifts.md: new
  requirements/data/unify-drifts.md: new
  requirements/cli/unify-drifts.md: new
  model-changes/proposal.md: 53371bf823ebf21eedd0a10d9cf7c3e252eb389d7093f612a2081707989eed76
  agent-launching/agent-terminal.md: ef00015067dedd34b1e9fdf462ca21f8b4b55e12d97494080d6621df075526a1
  agent-questions/feature.md: cd04f3e4a5e4474a998fb104d9da56fb4f9ca807e5480fbce79884e5c62ca094
delete: []
request: 2026-10-22T08-18-44
created: 2026-10-22T06:47:05.317Z
label: Unify Drifts
---
# Unify Drifts

Quando più Drift aperti toccano le stesse cose o si contraddicono, risolverli uno alla volta crea loop: la correzione di uno rimette in discussione l'altro, e i Drift tornano. Torna, adattata, la raccolta di tutti i Drift aperti del vecchio `Resolve all`: Unify Drifts, nel menu della freccetta di + Add Work Item, li unisce in un unico Drift che il developer poi risolve con Resolve.

## Decisioni

- Unify Drifts crea subito un Drift nuovo, aperto, con la sua scheda rossa e `Resolve`; non c'è una Proposal di unificazione da approvare.
- Unisce tutti i Drift aperti fuori da ogni risoluzione in scrittura o aperta, senza scelta.
- I Drift unificati finiscono nel nuovo stato finale Unified, che ricorda il Drift in cui sono confluiti; non sono Dismissed e non frenano la registrazione futura della stessa differenza.
- L'agente chiede al developer solo i conflitti fra i Drift (dove vogliono cose incompatibili); la scelta della correzione resta a Resolve. Senza conflitti non c'è round.
- Una domanda di conflitto saltata tiene entrambe le strade: diventano modi di correggere diversi del Drift unificato.
- La voce è disponibile alle stesse condizioni di Resolve e con almeno due Drift da unire; indisponibile resta visibile, disabilitata, con i motivi.
- Mentre l'agente lavora conta come una risoluzione in corso: niente Run, Resolve né Dismiss Drift.
- Il Drift unificato ricorda tutte le origini e tutti i precedenti dei Drift che unisce; la sua correzione rimanda tutte le origini in To do.
- Le Proposal allegate ai Drift unificati sono scartate; quando serve l'agente allega al Drift unificato una sola Proposal nuova.
- Il lavoro segue le funzioni sperimentali come ogni lavoro che registra Drift: domanda pronta con l'Async Drift Resolver, giudizio dei Task liberi con il blocco sperimentale.
- Le istruzioni non sono una skill installata: sono un file Markdown dentro l'estensione, messo inline nel messaggio (con omp come `@<file>`, con la chat di Cursor come testo), che comincia con la riga fissa `Trama: Unify Drifts`, riconosciuta come il nome di una skill.
- Un solo `trama drift new` con la lista dei Drift da unire crea il nuovo e chiude gli altri in un passo; `origin` e `previous` accettano una lista, e nascono `unifies` e `unifiedInto`.
- Voce `Unify Drifts` prima di `Add Quick Task`; ghost `Unify` `Unifying <N> Drifts`; badge `Unifying` sulle schede raccolte e `unified` sul Drift nuovo, sezione `Unifies` nei suoi dettagli e riga `Unified into` nei Drift chiusi.
- Terminale di omp `Unify`, ruolo `trama.analysis`.

## Scelte dell'agente da verificare

- Con il blocco sperimentale acceso, un Drift unificato che non blocca nessun Task finisce, come ogni Drift così, nella risoluzione gialla del lavoro invece di restare rosso (salvo se ricorrente).
- Con `unifies`, `task` e `previous` non si passano: li calcola Trama; i precedenti comprendono anche i Drift di cui un'origine è il Task di correzione.
- Nei `--json` e nella Snapshot `origin` e `previous` diventano sempre liste; nel file restano una stringa con un solo valore.
- Il modello scelto per una Proposal vale per Resolve su un Drift unificato solo se tutte le sue origini appartengono a quella Proposal; Unify Drifts usa sempre `trama.analysis`.
- Testi nuovi: motivo `Unify needs at least two open Drifts`, badge `unified` con tooltip `Unifies <N> Drifts`, `recurring` con più precedenti `Recurring: follows <N> Drifts`, riga dell'istruzione "Unify the open Drifts … into one Drift, following the instructions above.", file `extension/media/unify-drifts.md`.
- Più di cinque strade dopo conflitti saltati si combinano in al più cinque modi di correggere.
