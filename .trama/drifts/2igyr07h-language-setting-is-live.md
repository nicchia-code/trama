---
status: resolved
resolution: proposal
refs:
  - panel/Settings
proposal: null
task: null
origin: null
option: null
note: null
created: 2026-10-24T19:39:36.025Z
job: 1a64e0c6-6cc2-4d34-a782-2220c2d94f82
---
# Language setting is live

## What happens

The Settings tab shows Language as an editable text field. A value saved there is applied to every agent launch, so the agents write their texts in that language.

## What should happen

The Language field is disabled: it shows that agents write in English for now, a saved value has no effect, and no instruction asks for a language.

## Fix options

### Disable the field as the Model says

Make the Language field read-only and stop applying any saved value to agent launches, so every agent writes in English as the Model describes. A language already saved is ignored. This contradicts the Settings Requirement, which describes the field as an editable text input, so that Requirement must be changed too before the change is consistent.

### Keep the field editable and applied

Keep the Language field editable and keep applying the saved value to every agent launch, as the code and the Settings Requirement already do. Nothing in the code changes. The Model's Settings text then stays out of date: it still says the field is disabled and has no effect.

## Where in the code

extension/src/host/agent.ts:41 (configuredLanguage, read at every launch); extension/src/host/prompts.ts:122 (withLanguage, applied to every instruction); extension/package.json (key trama.language, markdownDescription)

## Prepared question

```json
{
  "question": {
    "id": "2igyr07h",
    "question": "Should the Language setting be disabled as the Model says, or stay editable and applied to agents?",
    "context": "The Settings panel shows Language as an editable text field. A saved value is applied to every agent launch, so agents write their texts in that language. The Model says the Language field is disabled, that a saved value has no effect, and that no instruction asks for a language. The Settings Requirement describes the field as an editable text input, which matches the code and not the Model.",
    "options": [
      {
        "label": "Disable the field as the Model says",
        "description": "The field becomes read-only and no saved value is applied: every agent writes in English.",
        "details": "A language already saved is ignored. The Settings Requirement must also change to say the field is disabled."
      },
      {
        "label": "Keep the field editable, Model unchanged",
        "description": "The field stays editable and the saved value is applied to every agent launch, while the Model text stays as it is.",
        "details": "Nothing in the code changes, but the Model keeps saying the field is disabled and has no effect."
      },
      {
        "label": "Keep the field editable, update the Model",
        "description": "The field stays editable and the saved value is applied to every agent launch; the Model Settings text is rewritten to say so.",
        "details": "Nothing in the code changes. The Settings Requirement already describes this behaviour, so Model and Requirement agree."
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
  "fingerprint": "5bb458d113217bcd3f33031d708c088bc12e51000df7e260d3aec78cd1feb229",
  "prepared": "2026-10-24T19:50:41.044Z"
}
```
