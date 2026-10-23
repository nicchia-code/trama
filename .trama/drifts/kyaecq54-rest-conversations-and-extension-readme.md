---
status: resolved
resolution: fix-code
refs:
  - omp-chat-conversation/Agent idle
  - omp-chat-conversation/Waiting for the window
  - requirements/rules#omp-chat
  - requirements/tech#panel/Settings
proposal: null
task: yan34axq
origin: null
unifies:
  - 1sgiv448
  - omnly5st
  - 1cgpft9w
option: 3
note: null
resolvedBy: hd6y480p
created: 2026-10-23T11:23:29.720Z
job: 47d537d2-1147-4861-9b7e-b1da9fdd77d8
---
# Rest conversations and extension README

## What happens

Three differences.

- **Stop at rest.** The developer can press Stop on an omp Chat conversation whose agent is at rest for Trama. After the confirmation, Trama cancels the agent's current turn, changes nothing else, and the conversation stays at rest. The Model gives Stop no outcome at rest.
- **Resume at rest.** When the session of a conversation that was at rest is resumed, the conversation comes back at rest, but its Run, which ended when the agent went to rest, shows again as a Run in progress on the Board. Nothing follows that Run, so it stays in progress until the developer closes the conversation.
- **Extension README.** The extension has no README of its own, so the editor's Extensions view shows no description of the extension, although the Requirements say the extension README names the Settings tab's groups and says that changes are saved to the user settings.

## What should happen

- **Stop at rest.** A conversation at rest either does not offer Stop, or Stop has an outcome that the Model describes, so the developer knows what it does.
- **Resume at rest.** A conversation that was at rest comes back at rest with its history and no Run in progress, because its Run ended at rest and the rules say a conversation resumes as it was.
- **Extension README.** The extension has its own short README that names the Settings tab, its groups Agent, Models, Project and Features, and the rule that changes are saved to the user settings.

## Fix options

### Stop while working, Run only when working, README

Stop is offered only in Agent running, where the Model defines it. At rest the developer can still close the conversation, which ends the agent. On resume, the saved Run comes back only when the conversation was in Agent running, so a conversation saved at rest returns at rest with no job. The extension gets back its own short README for the Extensions view, which names the Settings tab and its groups Agent, Models, Project and Features, says that changes always go to the user settings, and links to the main README. Cost: the developer cannot interrupt a reply to their own message without closing the conversation, and the resume needs the saved state before it restores a job.

### Stop while working, drop Run at rest, README

Stop is offered only in Agent running. At rest the developer can still close the conversation. When a conversation goes to rest, its saved entry is written without the job, so no later save keeps it and a resume at rest brings back no Run. The extension gets back its own short README, which names the Settings tab, its groups Agent, Models, Project and Features, and the rule on user settings. Cost: conversations saved before the change still carry their job until they are closed or resumed once, and a reply to the developer's own message cannot be interrupted without closing the conversation.

### Keep Stop at rest, Run only when working, README

Stop at rest keeps cancelling the current turn with no change of state, as it does now, and the Model stays silent on this case. On resume, the saved Run comes back only when the conversation was in Agent running. The extension gets back its own short README, which names the Settings tab, its groups Agent, Models, Project and Features, and the rule on user settings. Cost: a behaviour the developer can see stays undescribed in the Model.

### Stop while working, Run only when working, manifest

Stop is offered only in Agent running. On resume, the saved Run comes back only when the conversation was in Agent running. The extension stays without a README, and the Extensions view takes its description from the package manifest: a short description that says what Trama is and that its settings are changed in the Settings tab. Cost: this matches the Requirements only in part, because the group names stay only in the main README and the Extensions view shows no groups. A reply to the developer's own message also cannot be interrupted without closing the conversation.

## Where in the code

- extension/src/host/omp-chat/conversations.ts: the stop request (`stopRequested`), which confirms and then cancels the session when the conversation is idle.
- extension/src/host/omp-chat/conversations.ts: the resume step that restores the saved job of every conversation, whatever its saved state (`resume`, around line 256), and the save step that keeps the job in the entry (`persist`, around line 352).
- extension/: there is no README.md in the folder. The manifest is extension/package.json, whose `description` is the only text about the extension.

## Prepared question

```json
{
  "question": {
    "id": "kyaecq54",
    "question": "How should omp Chat conversations at rest, and the extension's own README, behave?",
    "context": "Three differences between the code and the Model and Requirements of omp Chat and of the Settings tab.\n\n- **Stop at rest.** A conversation is *at rest* for Trama (Agent idle) once the agent's work for Trama is over and `trama.autoExit` is off; the developer can keep talking to the agent. While the agent answers such a message, the conversation shows Stop: after the confirmation, the agent's current turn is cancelled, nothing else changes and the conversation stays at rest. The Model gives Stop no outcome in Agent idle.\n- **Resume at rest.** When the editor window closes or reloads, Trama saves each conversation to resume it. A conversation saved at rest comes back at rest, but its Run, which ended when the agent went to rest, shows again as a Run in progress on the Board, and nothing follows it until the developer closes the conversation. The Model says a conversation resumes as it was, keeping the job only when the agent was working.\n- **Extension README.** The extension has no README of its own, so the editor's Extensions view shows only the one-line description of the manifest. The Requirements of the Settings tab say the extension README names the tab's groups (Agent, Models, Project, Features) and says that changes are saved to the user settings.",
    "options": [
      {
        "label": "Stop while working, Run only when working, README",
        "description": "Stop only in Agent running; a conversation resumed at rest brings back no Run; the extension gets its own short README.",
        "details": "Stop is offered only while the agent works for Trama; at rest the developer can still close the conversation, which ends the agent. On resume, the saved Run comes back only for a conversation saved while working. The extension README names the Settings tab, its groups Agent, Models, Project and Features, says that changes always go to the user settings, and links to the main README. Cost: a reply to the developer's own message cannot be interrupted without closing the conversation."
      },
      {
        "label": "Stop while working, drop Run at rest, README",
        "description": "Stop only in Agent running; the saved entry loses its job when the conversation goes to rest; the extension gets its own short README.",
        "details": "Stop is offered only while the agent works for Trama. When a conversation goes to rest, its saved entry is written without the job, so a later resume at rest brings back no Run. The extension README names the Settings tab, its groups and the rule on user settings. Cost: conversations saved before the change still carry their job until closed or resumed once, and a reply to the developer's own message cannot be interrupted without closing the conversation."
      },
      {
        "label": "Keep Stop at rest, Run only when working, README",
        "description": "Stop at rest keeps cancelling the current turn, unmentioned by the Model; a conversation resumed at rest brings back no Run; the extension gets its own short README.",
        "details": "The developer can still interrupt the agent's reply to their own message at rest, with no change of state; the Model stays silent on this case. On resume, the saved Run comes back only for a conversation saved while working. The extension README names the Settings tab, its groups and the rule on user settings. Cost: a behaviour the developer can see stays undescribed in the Model."
      },
      {
        "label": "Stop while working, Run only when working, manifest",
        "description": "Stop only in Agent running; a conversation resumed at rest brings back no Run; no README, a longer manifest description instead.",
        "details": "Stop is offered only while the agent works for Trama. On resume, the saved Run comes back only for a conversation saved while working. The extension stays without a README and the Extensions view takes a short description from the manifest that says what Trama is and that its settings change in the Settings tab. Cost: matches the Requirements only in part (no group names in the Extensions view), and a reply to the developer's own message cannot be interrupted without closing the conversation."
      },
      {
        "label": "Stop at rest described, Run back on resume, no README",
        "description": "The Model and Requirements describe Stop at rest and the Run that returns on resume; the extension has no README.",
        "details": "Stop at rest cancels the agent's current turn for the developer's message, with no change of state, and the Model says so. On resume, a conversation saved at rest brings back its saved job: its Run shows in progress on the Board until the conversation is closed. The extension has no README; the Requirements of the Settings tab stop asking for one and the Extensions view keeps the manifest's one-line description. Cost: a Run in progress that nothing follows after a reload, and no description of the Settings tab in the Extensions view."
      }
    ],
    "recommended": 2,
    "multi": false
  },
  "decisions": [
    {
      "decision": "fix-code",
      "option": 1
    },
    {
      "decision": "fix-code",
      "option": 2
    },
    {
      "decision": "fix-code",
      "option": 3
    },
    {
      "decision": "fix-code",
      "option": 4
    },
    {
      "decision": "proposal"
    }
  ],
  "fingerprint": "15494e55337a66c0ae055a016116733c3f44fb61d9b097aafabf355836e6eccb",
  "prepared": "2026-10-23T11:25:52.691Z"
}
```
