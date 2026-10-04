---
column: done
technical: false
refs:
  - drift/Open/developer.FIX_DRIFT_CODE
  - drift/Open/developer.ACCEPT_DRIFT_PROPOSAL
  - drift/Open/developer.DISMISS_DRIFT
  - requirements/rules#drift
drift: null
proposal: "0024"
agent: false
---
# Fix the code of a Drift with the chosen option and the developer's note

Keeping what should happen on a Drift that has options needs the number of one of them, counted from 1 in written order; with none given, or a number that is not an option's, the resolution is refused saying that an option must be chosen, and the Drift stays Open. A note is accepted whether or not the Drift has options; a Drift without options accepts no option and is fixed without choosing. The Task created carries, in this order: What happens and What should happen, the chosen option with its title and text and the developer's note when given, then Where in the code when the Drift has it. The option's number and the note are kept in the Drift. Accepting the attached Proposal and dismissing take neither an option nor a note, and are refused when given one.
