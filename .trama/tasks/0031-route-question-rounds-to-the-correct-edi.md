---
column: done
technical: false
refs:
  - question-round/Not asked
  - requirements/data#question-round
  - requirements/rules#question-round
  - requirements/tech#question-round
drift: null
proposal: "0012"
agent: false
---
# Route question rounds to the correct editor window over a private local channel

An agent started in a Trama terminal sends its questions to the launching editor window using the address supplied in its environment. Other callers discover the most recently focused live window with the same project open. Preserve explicit project-root selection independently of caller working directory and never show another project's questions. Use a current-user-only local socket or Windows named pipe, with discovery records outside the repository, no HTTP port, remote service, extra runtime library or second Cursor question-server configuration. Treat stale discovery records as unavailable and keep questions and answers out of persistent project files.
