---
column: done
technical: false
refs:
  - omp-chat-conversation/Agent idle
  - omp-chat-conversation/Waiting for the window
  - requirements/rules#omp-chat
  - requirements/tech#panel/Settings
drift: kyaecq54
proposal: null
agent: false
created: 2026-10-23T11:36:23.640Z
finished: 2026-10-23T11:37:24.082Z
---
# Fix code to match the Model: Rest conversations and extension README

## What happens

Three differences.

- **Stop at rest.** The developer can press Stop on an omp Chat conversation whose agent is at rest for Trama. After the confirmation, Trama cancels the agent's current turn, changes nothing else, and the conversation stays at rest. The Model gives Stop no outcome at rest.
- **Resume at rest.** When the session of a conversation that was at rest is resumed, the conversation comes back at rest, but its Run, which ended when the agent went to rest, shows again as a Run in progress on the Board. Nothing follows that Run, so it stays in progress until the developer closes the conversation.
- **Extension README.** The extension has no README of its own, so the editor's Extensions view shows no description of the extension, although the Requirements say the extension README names the Settings tab's groups and says that changes are saved to the user settings.

## What should happen

- **Stop at rest.** A conversation at rest either does not offer Stop, or Stop has an outcome that the Model describes, so the developer knows what it does.
- **Resume at rest.** A conversation that was at rest comes back at rest with its history and no Run in progress, because its Run ended at rest and the rules say a conversation resumes as it was.
- **Extension README.** The extension has its own short README that names the Settings tab, its groups Agent, Models, Project and Features, and the rule that changes are saved to the user settings.

## Chosen option

**Keep Stop at rest, Run only when working, README**

Stop at rest keeps cancelling the current turn with no change of state, as it does now, and the Model stays silent on this case. On resume, the saved Run comes back only when the conversation was in Agent running. The extension gets back its own short README, which names the Settings tab, its groups Agent, Models, Project and Features, and the rule on user settings. Cost: a behaviour the developer can see stays undescribed in the Model.

## Where in the code

- extension/src/host/omp-chat/conversations.ts: the stop request (`stopRequested`), which confirms and then cancels the session when the conversation is idle.
- extension/src/host/omp-chat/conversations.ts: the resume step that restores the saved job of every conversation, whatever its saved state (`resume`, around line 256), and the save step that keeps the job in the entry (`persist`, around line 352).
- extension/: there is no README.md in the folder. The manifest is extension/package.json, whose `description` is the only text about the extension.
