---
status: rejected
base:
  agent-launching/agent-terminal.md: 38424cdcd9ee673b47d1c2ab6a8e945e9561434cdf151783c32caee84c3abaad
  agent-launching/feature.md: 9e3e5c0b60201f7ee925dd291bef18fe8930ddd6e001c9f8caed867d6793b9f9
  project-setup/project.md: de67ccd7188c0e0777c4cc3f61c2a7691ba1c26794830f18ce61f4367ecdd78e
  agent-questions/question-round.md: 80c135924b8fd27c171ddadde295641dce7a1ce2b4144dc8e56f8ca5af7f28bf
  work/announcement.md: 61cd35cd5cedc1f815905123cb328f225d61acb6357101fcc4498ab9d41dc557
  work/task.md: a4e2c2f7ef81e9858a8dc29ef0c3e1e720f5369f3802e6a711368e7bb1e7e77a
  actors/editor-chat.md: 9bdb3ceaae314b80a8a5e35858a9d714b699970c97c2be9cb8ba05837086fa03
  actors/agent-hook.md: 9e0f48e8f5fe6d7373a3aa85e84e03f261c72a14431a68d8e18d86f4afe0759e
  actors/developer.md: b22c06a6af05deefd2e19e044db4c524d144442eba96345d5daa1e3d8b860497
  actors/terminal.md: b07a8191f01920192d60cf7684f919e370a3218284d21251fe1dedd6a4c524c3
  editor-panel/panel.md: cbe8cdd3e50737948527433c4382591b954cb8d7107071e46a430a80768a725b
  requirements/ui/settings-specs.md: afb2bfb22a6fefa7f3e42d9aef25edadc7e994c20b21ca599f25aa56a6e1d605
  requirements/ui/tasks.md: 963371e125cbb19a4dec20f7c0a1b496a62f2cce0df14809acb739f091df1913
  requirements/ui/agents.md: 98615a836905d54ab88726c30ea47819532bcdea35db958012917c1eefec662a
  requirements/quality/main.md: 3bb4860a83bedf68a2fe41a056c104a2d3e6bcb6f33250e67278f51a02dd2155
  requirements/cli/main.md: a5601b093fd9ba8a8094f69f4b5c867d6f221e97a58c33e85989cc4ecba9949d
  requirements/rules/scans.md: e6752028e0259a3471cdb4c1564d229c4d2fb53a190780c1be8324539138b5f8
  requirements/rules/agent-terminal.md: 9e3de9474b892ee899b77cbae0f43c1bbcf8bed66b7d87944063c8a18b4ae0e8
  requirements/rules/announcements.md: fb478f7a3217e81fdadfe9271a3e88a5123a18cc8170f29fc05d3cc24079ac36
  requirements/rules/project.md: 4c414606191e491c416afc5406538450ab467deeaf3f97f246ae0f652a579939
  requirements/rules/models.md: 4817d1311855c3b24f870668d10670df429cfa5664a4e2e1c7ffc375ff5f1bbe
  requirements/rules/turn-history.md: 4e2b5cc81a0207e9eb78a37eb035edf804a65047b50bf4414c0fc78f32403e60
  requirements/rules/questions-notices.md: 156be236b2f5b4e19c53c3b1d5a4c8e35b81dffc70ea7daa4c4d8e71e8993c09
  requirements/data/proposals.md: 00b26e70ed4ff6042e352da87c1f1d15a45625348b053a6db348d0dcf71ec9e0
  requirements/tech/scans.md: 0df69740150f858f55c08440b282e58da06086cd522094ae1db59a9f7dce7832
  requirements/tech/settings.md: 4fdaa0bc772115cad044a99c153c1d5050c5c8aa01bcc4e1734ca11e0cf93116
  requirements/tech/agent-terminal.md: 40c2898d0d6ca2c141bd27c14b47e2e8078a6031470da8697476d99d729581e1
  requirements/tech/editor-chat.md: 63712036838c8bc6c8d0d24f179c62f4d7cbab99107f1e3e3c7605444e0dc912
  requirements/tech/announcements.md: da0c0f8223329b296c4ffc8198dedc5ca477282ef55aa74921a0142d62326eef
  requirements/tech/general.md: 8db61c9336f3032ca9f29320af3f6a9f2225962894bc79fda3908b61e40a0e83
  requirements/tech/agent-hooks.md: 5f9967fa8bab644d89fa2e837b0e92125d269530ee8ee4cda573f15d1134f043
  requirements/tech/models.md: 0faa869f3eb527689e71f49ae0cf6397c753c47758754adcf66987299ddcc07e
  requirements/tech/questions-notices.md: 132890208dfae7a7176b500ca7da0d989207676c2d7b45654b8691022fca7aed
delete: []
created: 2026-10-21T04:52:26.494Z
label: omp e Cursor
---
# Solo omp e Cursor

Sostituisce la Proposal vtpziqbs, diventata obsoleta perché altri Requisiti sono cambiati mentre la scrivevo; stesso contenuto, riscritto sopra i Requisiti di adesso.

Trama smette di supportare Claude Code e la chat di Copilot in VS Code: gli agenti supportati sono due, la chat di Cursor e omp nel terminale integrato. Tutto ciò che esisteva solo per Claude Code e per Copilot sparisce da Modello, Requisiti, codice e documentazione.

Decisioni:
- L'estensione funziona in ogni editor: omp è pienamente supportato ovunque, anche in VS Code; la chat è solo quella di Cursor.
- `trama.agent` vale `cursor` (predefinito, la chat di Cursor) oppure `omp`.
- Un valore rimasto `claude` o `chat` vale il predefinito `cursor`, in silenzio, e non è riscritto.
- Un modello scelto per una Proposal con l'agente `claude` è scartato; uno con `chat` vale come `cursor`.
- Fuori da Cursor, con `cursor`, l'istruzione va subito negli appunti con un avviso dedicato che indirizza a omp e un pulsante che apre la scheda Settings; il lavoro non parte.
- Il controllo all'apertura e Update Agent Skills cancellano la definizione del sotto-agente di confronto di Copilot; dove l'estensione si attiva fuori da Cursor tolgono anche il file degli hook di Copilot e la sua registrazione.
- Trama dimentica `.claude/skills` e `.github/skills`: non le rigenera, non le ripulisce, non le esclude più dall'impronta del codice.
- `trama hook copilot` e `trama hook claude-question-tool` sono tolti.
- L'annuncio di un agente che Trama non ha avviato resta trattato come un annuncio della chat (`chat: editor`); cambia solo il motivo.
- Documentazione: README e UAT dichiarano Cursor (chat e omp) e ogni altro editor compatibile con omp; la UAT prova omp anche in VS Code. Una nuova ADR sostituisce le parti di 0001 e 0009 su VS Code, Copilot e Claude Code.

Scelte fatte da me, da verificare:
- Il testo negli appunti fuori da Cursor è lo stesso che riceverebbe la chat di Cursor (con la riga sul `PATH` e quella sulle domande).
- La definizione utente del sotto-agente di confronto si scrive solo quando l'estensione gira in Cursor; negli altri editor nessuna.
- Fuori da Cursor, con `cursor`, la scheda Settings non suggerisce modelli: i campi dei ruoli restano testo libero.
- La fine di un turno della chat di Cursor finisce anche il lavoro archiviato con provenienza `editor`, come prima faceva la fine di un turno di Copilot.
- `trama hook copilot` e `trama hook claude-question-tool` diventano comandi sconosciuti (errore d'uso), senza alias.
- Alcuni Requisiti nuovi stanno in `tech#agent-terminal` e `rules#agent-launching` invece che in `tech#General` e `rules#agent-terminal`, per tenere quei frammenti sotto i 12 KB.

## Already present
- `panel/Open/developer.SHOW_SETTINGS` — `extension/src/webview/shell.tsx` (tab Settings della barra del pannello)
- `drift-resolution/Running tasks/editor-chat.AGENT_INTERRUPTED` — `extension/src/host/agent.ts` (`watchAgentTerminal`, `endChatJobs` con esito anomalo sugli eventi della chat di Cursor)
- `drift-resolution/Resolving/editor-chat.AGENT_INTERRUPTED` — `extension/src/host/agent.ts` (`watchAgentTerminal`, `endChatJobs`)
- `drift-resolution/Running tasks/editor-chat.CONVERSATION_CLOSED` — `extension/src/host/agent.ts` (`watchAgentTerminal`, `endChatJobs`)
- `drift-resolution/Resolving/editor-chat.CONVERSATION_CLOSED` — `extension/src/host/agent.ts` (`watchAgentTerminal`, `endChatJobs`)
- `announcement/Announced/editor-chat.AGENT_INTERRUPTED` — `extension/src/host/announcements.ts` (ritiro degli annunci con `chat` sugli eventi della chat di Cursor)
- `announcement/Al lavoro/editor-chat.AGENT_INTERRUPTED` — `extension/src/host/announcements.ts`
- `announcement/Announced/editor-chat.CONVERSATION_CLOSED` — `extension/src/host/announcements.ts`
- `announcement/Al lavoro/editor-chat.CONVERSATION_CLOSED` — `extension/src/host/announcements.ts`
- `task/Taken by the agent/editor-chat.AGENT_INTERRUPTED` — `extension/src/host/agent.ts` (`watchAgentTerminal`, `releaseTakenTasks` per `cursor`)
- `task/Taken by the agent/editor-chat.CONVERSATION_CLOSED` — `extension/src/host/agent.ts` (`watchAgentTerminal`, `releaseTakenTasks` per `cursor`)

## Feedback

Superata: lo stesso contenuto è stato riscritto sopra i Requisiti di adesso e approvato nella Proposal 2oj2rgp7.
