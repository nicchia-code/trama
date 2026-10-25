---
column: done
technical: false
refs:
  - focus/Con focus
drift: rfvhkilq
proposal: null
agent: false
created: 2026-10-24T20:01:54.517Z
finished: 2026-10-24T20:47:46.653Z
---
# Fix code to match the Model: Choosing a Proposal ends focus

## What happens

With a focus on, choosing a Proposal in the selector of the Diagram, Requirements or Specs tab takes the focus off and draws the chosen Proposal. The Model lists that choice only for the state without focus.

## What should happen

With a focus on, choosing a Proposal in the selector is not a transition: the focus, its steps and the Proposal drawn stay as they are until Clear or Esc takes the focus off.

## Chosen option

**Disable the selector during focus**

While a focus is on, the Proposal selector of each tab is disabled, so the choice cannot be made until the developer clears the focus with Clear or Esc. The focus, its steps and the Proposal drawn stay as they are. Costs a small visible change in the three tabs, and the developer must clear the focus before changing the Proposal drawn.

## Where in the code

extension/src/webview/diagram/state.ts:224 (chooseProposal); extension/src/webview/requirements/index.tsx:242 (onProposal); extension/src/webview/specs/index.tsx:190 (onProposal)
