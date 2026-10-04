---
column: done
technical: false
refs:
  - panel/Diagram
  - drift/Open/developer.FIX_DRIFT_CODE
  - drift/Open/developer.ACCEPT_DRIFT_PROPOSAL
  - drift/Open/developer.DISMISS_DRIFT
  - requirements/ui#drift
drift: null
proposal: "0017"
agent: false
---
# Decide a Drift in the Diagram's detail panel by comparing its two sides

The detail panel of a Drift shows the two columns What happens and What should happen (with Model or Requirements beside it), each ending with a Keep this button and a line saying what it does. There are no Fix code, Accept Proposal or Dismiss buttons any more. The columns stack when the panel is narrow, the attached Proposal keeps its link, and each button's accessible name says the side and the Drift. Keeping what should happen creates the fix Task; keeping what happens approves the attached Proposal or, with none, closes the Drift.
