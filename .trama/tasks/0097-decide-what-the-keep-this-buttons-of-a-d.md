---
column: done
technical: false
refs:
  - drift/Open
  - requirements/ui#drift
drift: null
proposal: "0024"
agent: false
---
# Decide what the Keep this buttons of a Drift say and take, with the selected option and the note

In the comparison of a Drift, the right Keep this fixes the code with the selected option and the note when it is not empty; the left Keep this takes neither. The line under the right button reads A Task is created for the agent to fix the code with the chosen option, or ...to fix the code for a Drift without options. The right button's accessible name reads Keep what should happen for <Drift title> with option <option title> when there are options, and without the option otherwise; the group is named Fix options for <Drift title> and the field Note for <Drift title>. The first option, the recommendation, is marked (recommended) and is the selected one when the Drift first shows, and exactly one option is always selected. What the developer selected and typed for each Drift survives the refreshes of the Board and the Diagram during the session and is forgotten when the panel closes.
