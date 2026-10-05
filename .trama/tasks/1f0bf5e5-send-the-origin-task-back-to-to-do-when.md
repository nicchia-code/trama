---
column: done
technical: false
refs:
  - drift/Open/developer.FIX_DRIFT_CODE
  - drift/Code to be fixed
  - drift/Open/developer.ACCEPT_DRIFT_PROPOSAL
  - drift/Open/developer.DISMISS_DRIFT
  - requirements/rules#drift
drift: null
proposal: 94f35a4f
agent: false
created: 1970-01-01T00:00:00.038Z
---
# Send the origin Task back to To do when its Drift is fixed in the code

Fixing the code of a Drift with an origin Task that is not Done moves that Task to To do and clears the agent's mark on it; it then waits for the Task created for the fix until that one is Done. Accepting the attached Proposal or dismissing the Drift leaves the origin Task where it is and, like any resolution, ends the Drift's blocking of other Tasks. Fixing the code of a Drift whose origin is Done, or that has none, moves nothing. Tasks that were only blocked by overlap are free as soon as the Drift is resolved, whatever the resolution.
