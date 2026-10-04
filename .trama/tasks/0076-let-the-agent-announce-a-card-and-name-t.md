---
column: done
technical: false
refs:
  - announcement/Announced/agent.SUBMIT_PROPOSAL
  - announcement/Announced/agent.FILE_TASK
  - announcement/Announced/agent.FILE_DRIFT
  - announcement/Announced/developer.DISCARD_PROPOSAL
  - announcement/Preparing/agent.START_PROPOSAL
  - requirements/rules#announcement
  - requirements/tech#announcement
drift: null
proposal: "0020"
agent: false
---
# Let the agent announce a card and name the announcement when it creates the card

The agent can say that a card is coming and the announcement follows what the agent then does.

- A command and an agent tool announce a Proposal, a Task or a Drift with its title and give back the announcement's ID. The agent may run them, also from the terminal Trama started.
- Starting a Proposal, filing a Task and filing a Drift accept the announcement's ID, on the command line and in the tools. A Proposal started with an ID is bound to that announcement and the ghost takes its title.
- A Proposal started with no ID takes over the oldest announcement made by a design request that is still Preparing; with none waiting, it makes its own announcement, already Writing.
- The announcement is delivered when the bound Proposal is handed over (not when the hand-over is refused), or when a Task or Drift is filed with the ID of an announcement of the same kind. An ID that is unknown, already ended or of another kind never prevents the card from being created, and the output says that no such announcement was found.
- Discarding the Draft bound to an announcement withdraws it at once, with no notice.
- A Draft sent back to Draft after the hand-over does not bring the ghost back.
