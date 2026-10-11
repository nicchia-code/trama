---
column: done
technical: true
refs:
  - requirements/rules#announcement
  - requirements/tech#announcement
drift: null
proposal: null
agent: false
created: 2026-10-11T06:55:00.472Z
finished: 2026-10-11T07:01:51.416Z
---
# Describe announcement withdrawal without a timer in the documentation and acceptance script (technical)

The documentation and the manual acceptance script must describe announcements as the Requirements do: no timer and no quiet period ever withdraws an announcement. Only the agent's signals do (the typed command of its own terminal ending, its terminal closing, its hook saying it is idle, the end, interruption or closing of a chat conversation of the project), plus the discarded Draft and the start of the editor. Announcing or changing a check is no activity that restarts anything. A `proposal new` with no `--announcement` takes over the oldest design-request announcement of its own terminal only, not of any terminal. Announcements made by the chat are withdrawn by the chat's events, not only at startup. The title of a Writing announcement follows its Draft when the panel refreshes, not every thirty seconds. Remove the acceptance row that ages an announcement by editing its `touched` and waits for the ghost to vanish.
