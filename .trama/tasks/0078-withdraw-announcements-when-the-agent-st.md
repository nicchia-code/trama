---
column: done
technical: false
refs:
  - announcement/Announced/terminal.COMMAND_ENDED
  - announcement/Announced/terminal.CLOSED
  - announcement/Announced/time.QUIET_PERIOD_ELAPSED
  - requirements/rules#announcement
  - requirements/tech#announcement
  - requirements/data#announcement
drift: null
proposal: "0020"
agent: false
---
# Withdraw announcements when the agent stops, goes quiet or the extension starts, and tell the developer

Ghosts do not outlive the agent's work.

- When the command of the agent terminal Trama started ends, or that terminal is closed, every announcement still waiting is withdrawn at once and each gives a notice to the panel.
- When fifteen minutes pass without the agent announcing a card, changing a Draft it announced or filing a card, every announcement still waiting is withdrawn with the same notice. The fifteen minutes do not count while a question round is open and start again when it closes; only the fact that a round is open is known, never its questions.
- When the extension starts, it withdraws every announcement left on disk, without a notice.
- The notices are kept in memory by the panel; a notice stays until the developer closes it or the panel is closed.
- The panel is also told, with each picture, whether a question round is open.
