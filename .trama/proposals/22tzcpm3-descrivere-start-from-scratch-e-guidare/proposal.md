---
status: approved
base:
  editor-panel/panel.md: 622eebb8f4a85301ef5e85018376172186c711a0da816933f8c60ee1b46b84f8
  project-setup/project.md: 2aaa3d5db9a9ce87084cee7a3a2fa847c89dc43ee888b864018d6245ebb20529
  project-setup/feature.md: e2689f46cb47efbafe41e91b6f5f17478ecd07bd968997ef0516de2c4b187db7
  agent-launching/design-request.md: 2ad0a5289c7b75a094362b3e3998d64d47e2a48690441b5d9df41bb80658d65c
  model-changes/proposal.md: 3c7589b64d769a3242411cd8ce37291d669821dc253a96c9c94f70c85eec77e1
  actors/developer.md: 9e52ad31b95c3efbd3c14b645186f446108b4fd103cb018f06fae020247a5088
  requirements/ui/agents.md: eb5ec39a4a87f97126d57b1749dc9771bf7859acfbbc5d72a388735663691c6c
  requirements/ui/panel.md: 839127f54c2b206268dc0d2f91f6ebd2f2463aa5f4258f0d37c207bea472c771
  requirements/rules/requests.md: b1aab9528c15be265234df3a1b9c0c6c13e4dc4704ee1d1dd97749554736d1fd
  requirements/rules/project.md: 278761ff8c51a37015ca45f46a991cb56a83f99bb2bb64fc6a6d0ee02b52e882
  requirements/rules/agent-terminal.md: dc2a81d90bbee2564ab8b93a6befb76e5e10a9f7d5fd7d74f1e0037fc08e80c1
  requirements/rules/decisions.md: 48d89db7f6f20b7d2f3d8b3781beb755a34a593991ef0976a57a9b6278539549
  requirements/data/agents.md: 13d9d4b8895ccf68c73c842730d4e9f4c045350bdd6e101fdf3cba74093b8a46
  requirements/data/proposals.md: a8dd3ba35b79bcf29751a29c9eec64e3c64d8e5f73ef60c4cd57403dd3f1f632
  requirements/tech/requests.md: 6fa847e441b511d35bdb38054952c3ed64d9ad6134c0e7c0a8d7e476e812282f
  requirements/tech/project-panel.md: 9b374afb1f6566bf9d1f90f58228f21b4465be3adddd0590ca124e166f1ffbf1
  requirements/ui/get-started.md: new
delete: []
created: 2026-10-16T05:07:08.460Z
---
# Descrivere Start from Scratch e guidare le richieste scritte con un testo fantasma

Start from Scratch esiste nel codice (Get Started, avviso della cartella con file, inizializzazione, richiesta di setup, Proposal di setup, Run all To do dopo il setup) ma non nel Model né nei Requisiti. Inoltre la scheda che si apre è un file vuoto chiamato con data e ora: il developer non capisce che deve descrivere l'applicativo da costruire né che chiudere la scheda lo invia.

Decisioni:
- Il Model descrive tutto Start from Scratch, com'è nel codice, salvo le decisioni qui sotto.
- Le schede delle richieste scritte mostrano un testo fantasma, una decorazione dell'editor che non finisce nel file: regole del vuoto, titolo e skill restano invariate.
- Testo per Start from Scratch: «Describe the application to build: what it does and who it is for. Close this tab or press Send to agent when you are done.»
- Testo per Design…: «Describe the change to design: behaviour, edge cases, requirements. Close this tab or press Send to agent when you are done.»
- I testi sono in inglese, come il resto dell'interfaccia.
- Il testo si vede solo su una richiesta mai inviata e solo finché il documento non ha nessun carattere; torna se il developer cancella tutto.
- Start from Scratch dal Diagramma, in un progetto che esiste già con il Model vuoto, apre subito la richiesta di setup, senza avviso e senza inizializzazione.
- Con il Model vuoto il Diagramma offre Import from Code e Start from Scratch.
- La Proposal di setup si approva da sola alla consegna se il Model è ancora vuoto; altrimenti resta aperta e l'editor avvisa.
- Dopo l'approvazione del setup parte Run all To do, come oggi; con l'editor chiuso i Task restano in To do.
- L'avviso di Get Started resta com'è.

## Already present
- `project-setup` — `extension/src/host/project.ts` (`initializeProject`, `confirmScratch`), `extension/src/host/controller.ts` (`setUp`)
- `project/Not a Trama project` — `extension/src/host/project.ts` (`initializeProject`, `confirmScratch`, `NO_PROJECT_WARNING`), `src/cli/commands.ts` (`init`), `src/cli/skills.ts` (`SKILLS` con `trama-setup`)
- `developer.INITIALIZE_PROJECT` — `extension/src/webview/getstarted/index.ts` (messaggio `initialize`), `extension/src/host/controller.ts` (`setUp`)
- `developer.OPEN_PANEL` — `extension/src/host/controller.ts` (`open`), `extension/src/host/main.ts` (pulsante della barra di stato), `extension/package.json` (icona `trama.open`)
- `panel/Closed/developer.OPEN_PANEL` — `extension/src/host/controller.ts` (`open`, `create`)
- `panel/Open/developer.OPEN_PANEL` — `extension/src/host/controller.ts` (`open`)
- `panel/Open/developer.SHOW_DIAGRAM` — `extension/src/webview/main.ts` (`setProject` nasconde le schede senza progetto)
- `panel/Open/developer.SHOW_BOARD` — `extension/src/webview/main.ts` (`setProject`)
- `panel/Open/developer.SHOW_REQUIREMENTS` — `extension/src/webview/main.ts` (`setProject`)
- `panel/Open/workspace.MODEL_CHANGED` — `extension/src/host/controller.ts` (`refresh` manda `project`), `extension/src/webview/main.ts` (`setProject`)
- `panel/Get Started` — `extension/src/webview/getstarted/index.ts`, `extension/src/host/controller.ts` (`setUp`)
- `question-round/Out of sight/developer.OPEN_PANEL` — `extension/src/host/controller.ts` (`open`, `questions.restore`)
- `proposal` — `src/core/proposals.ts` (`kind` `setup`, `coversScope`, `submitProposal`), `src/cli/commands.ts` (`proposal new --setup`, output di `proposal submit`)
- `requirements/data#design-request` — `extension/src/host/design-requests.ts` (`SENT_KEY`, `SETUP_KEY`, `settleSetup`), `src/core/design-requests.ts` (`createRequest`)
- `requirements/data#proposal` — `src/core/proposals.ts` (`kind`, cartella `tasks/`)
- `requirements/rules#agent-terminal` — `extension/src/host/prompts.ts` (`terminalName`, `Setup`), `extension/src/host/design-requests.ts` (`deliver`)
- `requirements/rules#proposal` — `src/core/proposals.ts` (`holdsTasks`, `submitProposal`), `src/cli/commands.ts` (`--setup`, messaggi di `proposal submit`)
- `requirements/tech#project` — `extension/src/host/project.ts` (`initializeProject` con `--skills-dir` e `--force`), `extension/src/host/controller.ts` (`setUp`)
- `requirements/ui#panel/Get Started` — `extension/src/webview/getstarted/index.ts`, `extension/src/host/project.ts` (`pickFolder`)
- `requirements/ui#panel/Diagram` — `extension/src/webview/diagram/index.ts` (`.dg-empty`, `data-import`, `data-scratch`), `extension/src/webview/diagram/levels.ts` (`isEmptyModel`)
- `requirements/ui#project` — `extension/src/host/project.ts` (`confirmScratch`, dialogo di conflitto, `NO_PROJECT_WARNING`, `pickFolder`), `extension/src/host/controller.ts` (`open`)
