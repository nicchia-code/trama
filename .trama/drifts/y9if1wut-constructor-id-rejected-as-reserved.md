---
status: resolved
resolution: unified
refs:
  - requirements/data#General
proposal: null
task: null
origin: null
unifiedInto: 88lo546l
option: null
note: null
created: 2026-10-24T19:48:05.061Z
job: 1a64e0c6-6cc2-4d34-a782-2220c2d94f82
---
# Constructor ID rejected as reserved

## What happens

A Feature, Machine or Actor named with the ID constructor is refused as a reserved name, although only four names are reserved. The lookup of reserved names finds an inherited property of plain objects, so any ID that the object already has is refused.

## What should happen

Only the four reserved names (system, feature, actors, requirements) are refused. Every other valid kebab-case ID, including constructor, is accepted.

## Fix options

### Own-property check (Recommended)

Test reserved names as own properties of the reserved table, the same way the Windows device-name check already does. Only the four reserved names are refused, and constructor or any other inherited name is accepted when it is a valid ID. No Model or Requirement text changes, and no other caller changes.

### Null-prototype or Set lookup

Declare the reserved names as a set, or as a table with no prototype, so that no inherited key can match. The check that refuses the ID then needs no change. This removes the whole class of inherited-name errors in one place, but it changes the type of the exported table, so every place that reads it must be checked.

## Where in the code

src/core/model.ts, the check that claims an ID while building the Model; src/core/types.ts, the RESERVED_IDS table

## Prepared question

```json
{
  "question": {
    "id": "y9if1wut",
    "question": "Should a Feature, Machine or Actor be allowed to have the ID constructor?",
    "context": "Features, Machines and Actors share one namespace of kebab-case IDs, and the Requirements reserve exactly four names: system, feature, actors and requirements. The ID constructor is a valid kebab-case ID, yet building the Model refuses it as a reserved name, because the lookup of reserved names also finds a name every plain object already has.",
    "options": [
      {
        "label": "Own-property check",
        "description": "Reserved names are tested as own entries of the reserved table, as the Windows device-name check does; constructor is accepted.",
        "details": "Only the four reserved names are refused. No Model or Requirement text changes and no other caller changes."
      },
      {
        "label": "Set or null-prototype table",
        "description": "The reserved names become a set or a table without inherited keys; constructor is accepted.",
        "details": "Removes the whole class of inherited-name errors in one place, but changes the type of the exported table, so every place that reads it must be checked."
      },
      {
        "label": "Reserve constructor too",
        "description": "constructor is refused as a reserved name, alongside system, feature, actors and requirements.",
        "details": "No code change. The Requirements list constructor among the reserved IDs."
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
  "fingerprint": "37f2c621605f79d7ce5164ce4d7b69a2829edb87003f79067b4895adae42a108",
  "prepared": "2026-10-24T20:09:04.663Z"
}
```
