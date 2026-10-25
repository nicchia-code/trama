---
status: resolved
resolution: fix-code
refs:
  - focus/Con focus
proposal: null
task: yh0ni696
origin: null
option: 1
note: null
resolvedBy: hpl5iy6x
created: 2026-10-24T19:37:45.119Z
job: 1a64e0c6-6cc2-4d34-a782-2220c2d94f82
---
# Choosing a Proposal ends focus

## What happens

With a focus on, choosing a Proposal in the selector of the Diagram, Requirements or Specs tab takes the focus off and draws the chosen Proposal. The Model lists that choice only for the state without focus.

## What should happen

With a focus on, choosing a Proposal in the selector is not a transition: the focus, its steps and the Proposal drawn stay as they are until Clear or Esc takes the focus off.

## Fix options

### Disable the selector during focus

While a focus is on, the Proposal selector of each tab is disabled, so the choice cannot be made until the developer clears the focus with Clear or Esc. The focus, its steps and the Proposal drawn stay as they are. Costs a small visible change in the three tabs, and the developer must clear the focus before changing the Proposal drawn.

### Ignore the choice during focus

While a focus is on, a choice made in the selector is dropped: the selector goes back to the Proposal drawn and the focus stays. The selector stays enabled, so nothing visibly breaks, but the developer gets no sign of why the choice did not take. Costs a short message or tooltip to explain it.

## Where in the code

extension/src/webview/diagram/state.ts:224 (chooseProposal); extension/src/webview/requirements/index.tsx:242 (onProposal); extension/src/webview/specs/index.tsx:190 (onProposal)

## Prepared question

```json
{
  "question": {
    "id": "rfvhkilq",
    "question": "With a focus on, what should choosing a Proposal in the selector of the Diagram, Requirements or Specs do?",
    "context": "With a focus on, choosing a Proposal in the selector of the Diagram, Requirements or Specs takes the focus off and draws the chosen Proposal. The Model says the focus ends there, but the Drift's expected behaviour is that the focus, its steps and the Proposal drawn stay as they are until Clear or Esc takes the focus off.",
    "options": [
      {
        "label": "Disable the selector during focus",
        "description": "The Proposal selector of each tab is disabled while a focus is on.",
        "details": "The choice cannot be made until the developer clears the focus with Clear or Esc. Costs a small visible change in the three tabs; the developer must clear the focus before changing the Proposal drawn."
      },
      {
        "label": "Ignore the choice during focus",
        "description": "A choice made in the selector is dropped while a focus is on.",
        "details": "The selector goes back to the Proposal drawn and the focus stays. The selector stays enabled, but the developer gets no sign of why the choice did not take; costs a short message or tooltip."
      },
      {
        "label": "Choosing a Proposal ends the focus",
        "description": "The choice takes the focus off and draws the chosen Proposal.",
        "details": "This is the behaviour the Model already describes and the code has today."
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
      "decision": "dismissed"
    }
  ],
  "fingerprint": "28a95bc9b24d15a6966de0f4914a4744f259c347463dbe940d72857dac47d90d",
  "prepared": "2026-10-24T19:49:38.432Z"
}
```
