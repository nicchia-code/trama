---
status: resolved
resolution: proposal
refs:
  - requirements/rules#design-request
proposal: null
task: null
origin: null
option: null
note: null
resolvedBy: ae0ap66k
created: 2026-10-24T19:40:44.862Z
job: 1a64e0c6-6cc2-4d34-a782-2220c2d94f82
---
# Setup instruction cites nonexistent flag

## What happens

The instruction sent for a setup request binds the setup Proposal to its request through the request field of the Proposal input, the same way the design instruction does. The Requirement instead writes that binding as a request flag.

## What should happen

The Requirement and the instruction should name the same binding. The Proposal command takes the request field and has no request flag, so the Requirement sentence describes a flag that does not exist.

## Fix options

### Fix the Requirement

Rewrite the sentence of the setup instruction in the design request Requirement so that it names the request field, as the command and the design instruction do. The code stays as it is and the agent keeps receiving the same instruction. It costs one line of Requirement text and changes no behaviour, because the agent already receives the field.

### Add a request flag

Make the Proposal command accept a request flag as well as the request field, so that the Requirement sentence becomes true. It costs a new option in the command, its documentation and its tests, and leaves two spellings of the same binding, which the agent may then mix up in the instructions it receives.

## Where in the code

extension/src/host/prompts.ts, the setup-request case of buildPrompt

## Prepared question

```json
{
  "question": {
    "id": "buuz9gu2",
    "question": "How should the setup request instruction and its Requirement agree on binding the setup Proposal to its request?",
    "context": "When the developer sends a setup request (Start from Scratch), Trama sends the agent a one-line instruction that names the `trama-setup` skill and tells it how to bind the setup Proposal to the request. The design request Requirement quotes that instruction with a request flag (`--request <id>`), but the Proposal command has no such flag: it binds through the `request` field of its input, the same way the written design instruction says it. The two texts must name the same binding.",
    "options": [
      {
        "label": "Fix the Requirement",
        "description": "A fix rewrites the Requirement sentence so it names the `request` field, as the command and the design instruction do.",
        "details": "One line of Requirement text; no behaviour changes, because the agent already receives the field. It goes through a fix Task rather than a reviewed Model change."
      },
      {
        "label": "Add a request flag",
        "description": "The Proposal command also accepts a request flag, so the Requirement sentence becomes true.",
        "details": "A new command option, its documentation and its tests; leaves two spellings of the same binding, which agents may then mix up."
      },
      {
        "label": "Requirement names the request field",
        "description": "The attached Proposal rewrites the setup instruction in the design request Requirement to bind with the `request` field.",
        "details": "Only the quoted instruction in the Requirement changes; the command and the instruction stay as they are. Reviewed and approved like any Model change."
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
      "decision": "proposal"
    }
  ],
  "fingerprint": "b747ec08e69e640c4f2186512079277505b6b099bc372d113ebc3414957224e1",
  "prepared": "2026-10-24T20:09:16.331Z"
}
```
