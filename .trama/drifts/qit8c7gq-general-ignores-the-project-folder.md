---
status: resolved
resolution: unified
refs:
  - requirements/rules#omp-chat-general
  - requirements/tech#omp-chat-general
proposal: null
task: null
origin: null
unifiedInto: 88lo546l
option: null
note: null
created: 2026-10-24T19:39:19.124Z
job: 1a64e0c6-6cc2-4d34-a782-2220c2d94f82
---
# General ignores the project folder

## What happens

General runs in the first workspace folder of the window, even when the Trama project is another folder of a multi-root workspace, while the conversations of jobs run in the project folder.

## What should happen

General runs in the folder the panel uses for the window: the Trama project folder when one is open, otherwise the first folder, the same choice the panel makes.

## Fix options

### Use the panel folder

General takes the folder the panel chooses: the Trama project folder when one is open, otherwise the first folder. That is the same choice the conversations of jobs already make through the project finder. It changes only the folder function of General; the rest of its launch stays the same.

### Share one folder helper

A single helper gives the panel's folder to the panel title, to the conversations and to General alike, so the three cannot choose different folders again. It changes the title code and General to read the helper. It costs a small refactor touching the panel title, but it keeps the choice in one place.

## Where in the code

extension/src/host/agent.ts, generalDeps, folder (line 196), which reads the first workspace folder; the conversations use findProject()?.root, as passed in extension/src/host/main.ts at line 115.

## Prepared question

```json
{
  "question": {
    "id": "qit8c7gq",
    "question": "In which folder should General run when the window has several workspace folders?",
    "context": "General is the omp chat of the window and runs in one folder. In a multi-root workspace the panel uses the Trama project folder when one is open (otherwise the first folder), and the conversations of jobs run in that project folder. The Requirements say General runs in the same folder the panel chooses.",
    "options": [
      {
        "label": "Use the panel folder",
        "description": "General takes the folder the panel chooses: the Trama project folder when one is open, otherwise the first folder; only General's folder choice changes.",
        "details": "Matches the Requirements and the conversations of jobs with a one-line change; the choice still lives in more than one place."
      },
      {
        "label": "Share one folder helper",
        "description": "One helper gives the panel's folder to the panel title, the conversations and General alike.",
        "details": "The three can no longer pick different folders, at the cost of a small refactor touching the panel title."
      },
      {
        "label": "Run in the first workspace folder",
        "description": "General always runs in the first folder of the workspace, even when the Trama project is another folder; the Requirements are updated to say so.",
        "details": "No code change; in a multi-root workspace General may look at a different folder than the panel and the jobs."
      }
    ],
    "recommended": 0,
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
      "decision": "proposal"
    }
  ],
  "fingerprint": "239bd8ce9ab1c301e429a1e5a0d425fd7f9d43c0a878f0c011b49844e8696e64",
  "prepared": "2026-10-24T20:09:10.129Z"
}
```
