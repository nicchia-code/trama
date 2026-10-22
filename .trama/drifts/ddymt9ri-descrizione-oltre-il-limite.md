---
status: resolved
resolution: fix-code
refs:
  - requirements/ui#General
  - requirements/ui#panel/Settings
proposal: null
task: 7j5eejmu
origin: vodozu43
option: 1
note: null
resolvedBy: uhzymp0z
created: 2026-10-22T04:43:49.668Z
job: 9e403707-f732-4181-a697-26a2272f52cc
---
# Descrizione oltre il limite

## What happens

The setting `trama.ignoreInstructionFiles` would carry the description fixed by the Requirement: 181 characters, two sentences. The existing check on manifest descriptions allows 170 and fails on it.

## What should happen

The tooltip rule says the description of a setting, shown in the «i» bubble, is at most two short sentences of about 160 characters. The Requirement for the Agent terminal fixes a text that exceeds it, so two Requirements disagree.

## Fix options

### Shorten the description

Rewrite the Requirement text under 170 characters, keeping the meaning (omp, the four file kinds, off by default). The check stays as it is.

### Allow longer descriptions

Amend the tooltip rule (or this one exception) to allow about 185 characters, and raise the check to match.

## Where in the code

extension/package.json, `trama.ignoreInstructionFiles`; test/settings-schema.test.ts, the description length check.

## Prepared question

```json
{
  "question": {
    "id": "ddymt9ri",
    "question": "How should the description of Ignore Instruction Files fit the length rule?",
    "context": "The setting `trama.ignoreInstructionFiles` has a description fixed by the Agent terminal Requirement, 181 characters in two sentences. The tooltip rule says a setting's description is at most two short sentences of about 160 characters, and the existing check on manifest descriptions allows 170. Two Requirements disagree, so Task T3 stays in progress and the check fails on this one description. It is a new difference with no earlier Drift.",
    "options": [
      {
        "label": "Shorten the description",
        "description": "Rewrite the description under 170 characters, keeping the meaning (omp, the four kinds of file, off by default). The length check stays as it is."
      },
      {
        "label": "Raise the check to about 185",
        "description": "Allow descriptions of about 185 characters in the check, and amend the tooltip rule to match. The description is the one already written."
      },
      {
        "label": "Keep the text, change the rule",
        "description": "Keep the description exactly as the Requirement fixes it and adopt the attached Proposal, which raises the limit for setting descriptions to about 185 characters while panel tooltips stay at 160. The length check in the tests must then be raised to match, as a code change afterwards."
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
  "fingerprint": "8955b2ea18358e2237034af062ca3a78d9270a6faeea91a68f751984d9fc8b92",
  "prepared": "2026-10-22T04:55:54.147Z"
}
```
