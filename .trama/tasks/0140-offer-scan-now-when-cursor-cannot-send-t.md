---
column: done
technical: false
refs:
  - agent-terminal/No agent terminal/proposal.APPROVED
  - requirements/rules#agent-terminal
drift: null
proposal: "0030"
agent: false
---
# Offer Scan now when Cursor cannot send the automatic scan by itself

After an ordinary Proposal is approved in Cursor with the chat launcher, the automatic scan starts by itself only when the new chat sends it by itself (`composer.createNew`).

If that is not possible, nothing is sent through the deeplink or the clipboard and no chat is left waiting: the developer gets the notice «Trama: Proposal <id> was approved. Scan the Features it affects?» with the button «Scan now». The button sends the same scan instruction, naming the approved Proposal, through the whole delivery chain; closing the notice does nothing.
