---
column: done
technical: false
refs:
  - panel/Settings
  - setup-wizard
  - panel/Closed/developer.SHOW_SETTINGS
  - panel/Open/developer.SHOW_SETTINGS
  - panel/Closed/developer.OPEN_GUIDED_SETUP
  - panel/Open/developer.OPEN_GUIDED_SETUP
  - requirements/tech#panel/Settings
  - requirements/tech#drift-resolution
  - requirements/tech#task
  - requirements/ui#panel/Settings
  - requirements/ui#agent-launching
  - requirements/ui#setup-wizard
  - requirements/ui#drift-resolution
  - requirements/rules#setup-wizard
  - requirements/rules#work
  - requirements/rules#drift
  - requirements/quality#agent-launching
  - requirements/quality#drift-resolution
drift: null
proposal: 54yy16h2
agent: false
created: 2026-10-23T08:09:20.219Z
finished: 2026-10-23T08:15:21.251Z
---
# Chiavi e gruppo Features

Quando il Task è finito, la scheda Settings e il passo Advanced del wizard di setup non hanno più nulla di «experimental», e le cinque funzioni facoltative hanno chiavi nuove.

Decisioni del developer da rispettare:
- Chiavi rinominate **senza migrazione**: `trama.experimentalDriftBlocker` → `trama.driftBlocker`, `trama.experimentalAdvisorScanner` → `trama.advisorScanner`, `trama.experimentalParallelExecution` → `trama.parallelExecution`, `trama.experimentalAsyncDriftResolver` → `trama.asyncDriftResolver`, `trama.experimentalContextSharing` → `trama.subagentsContextSharing`. Le vecchie chiavi spariscono dal manifest (`extension/package.json`) e nessun codice le legge più; un valore rimasto nelle impostazioni utente è ignorato e non viene riscritto, quindi una funzione accesa prima torna spenta finché il developer non la riaccende.
- Tutte e cinque restano `"type": "boolean"`, `"default": false`, `scope: "application"`, lette solo dal valore utente (`inspect(key).globalValue === true`); un valore non booleano vale spento. Le funzioni di lettura in `extension/src/host/agent.ts` leggono solo le chiavi nuove: `configuredDriftBlocker`, `configuredAdvisorScanner`, `configuredParallelExecution`, `configuredAsyncDriftResolver` e `configuredSubagentsContextSharing` (al posto di `configuredContextSharing`).
- Titoli: `Drift Blocker`, `Advisor Scanner`, `Parallel Execution`, `Async Drift Resolver` si ricavano dalla chiave con `settingTitle`. `Sub-agents Context Sharing` non si ricava dalla chiave: `extension/src/host/settings-schema.ts` ha un elenco di titoli espliciti, che contiene solo `trama.subagentsContextSharing` → `Sub-agents Context Sharing`, e `settingTitle` lo consulta prima di ricavare il titolo; la scheda Settings e il wizard mostrano lo stesso titolo.
- Descrizioni (`markdownDescription`) senza il prefisso «Experimental.»: `trama.driftBlocker` «On: a new Drift blocks only the Tasks it really affects; one that blocks none arrives as a resolution Proposal.»; `trama.advisorScanner` «On: during every Run an advisor, using the Scan model, checks the code against the Model and files Drifts; all scans are off.» (il controllo è sempre attivo, qualunque sia `trama.agent`); `trama.parallelExecution` «On: in a run of several Tasks the agent may start together Tasks that concern the same thing, giving a reason.»; `trama.asyncDriftResolver` «On: the agent prepares each Drift's resolution question, so `Resolve` asks it at once without starting an agent.»; `trama.subagentsContextSharing` «On: the agent passes its sub-agents what it has already read about their work, so they do not read it again.».
- Il gruppo `Experimental` di `SETTING_GROUPS` diventa `Features`, ultimo gruppo, con in quest'ordine `trama.driftBlocker`, `trama.advisorScanner`, `trama.parallelExecution`, `trama.asyncDriftResolver`, `trama.subagentsContextSharing`, tutte `Checkbox`. I gruppi sono `Appearance`, `Agent`, `Models`, `Project`, `Features`; nessun titolo, nessuna descrizione e nessun gruppo dice «Experimental».
- Wizard (`extension/src/webview/wizard/logic.ts`): il passo `Advanced` mostra `trama.theme` e poi le impostazioni del gruppo `Features` nel loro ordine (`trama.driftBlocker`, `trama.advisorScanner`, `trama.parallelExecution`, `trama.asyncDriftResolver`, `trama.subagentsContextSharing`; `trama.submitWhileRunning` non c'è più, la toglie anche il Task su Submit While Running), e la sua frase è «Theme and optional features. You can skip this step.». Il Modello descrive il passo come «Il tema del pannello e le funzioni facoltative del gruppo Features».
- Il tooltip e il nome accessibile del badge `blocks nothing` di una risoluzione `nonBlocking: true` (`extension/src/webview/board/logic.ts`) diventano `Filed by the Drift Blocker: these Drifts block no Task. Approve or reject it like any resolution.`.
- `trama task list` con `heldBack` continua a non leggere `trama.parallelExecution`.

I test che fissano gruppi, titoli, descrizioni, letture e wizard (`test/settings-schema.test.ts`, `test/wizard-logic.test.ts`, `test/host-setup-wizard.test.ts`, `test/wizard-view.test.tsx`, `test/host-agent-terminals.test.ts` dove accendono le impostazioni, `test/prepared-resolve-instant.test.ts`) usano le chiavi, i titoli e il gruppo nuovi. `CHANGELOG.md` ha una voce nuova che elenca le chiavi rinominate e dice che chi aveva acceso una funzione la deve riaccendere; le voci vecchie non cambiano. `README.md` ed `extension/README.md`, dove nominano il gruppo, nominano `Features`.
