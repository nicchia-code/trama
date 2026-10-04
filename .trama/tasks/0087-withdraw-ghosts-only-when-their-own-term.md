---
column: done
technical: false
refs:
  - announcement/Announced/terminal.COMMAND_ENDED
  - announcement/Announced/terminal.CLOSED
  - agent-terminal
  - requirements/rules#announcement
  - requirements/tech#announcement
drift: null
proposal: "0022"
agent: false
---
# Withdraw ghosts only when their own terminal's agent command ends or the terminal closes

The announcements of an agent terminal are withdrawn, with the notice that the agent finished without delivering, only when the command Trama typed into that terminal ends or that terminal is closed. The end of any other command, in that terminal or in another, and the close of another terminal, withdraw nothing, and neither of them moves the agent terminal to idle. Trama recognises the command it typed by the command line the terminal reports for it, compared after trimming; when the terminal reports the end of a command without a command line, or with another one, nothing is withdrawn for that reason, and the close of the terminal and the fifteen minutes of quiet still withdraw. Announcements that belong to no terminal are withdrawn only by the quiet period and by the editor starting up, which keep applying to every announcement.
