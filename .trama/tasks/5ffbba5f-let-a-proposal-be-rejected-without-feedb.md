---
column: done
technical: false
refs:
  - proposal/Open/developer.REJECT_PROPOSAL
  - requirements/rules#proposal
  - requirements/data#proposal
drift: null
proposal: f8b74305
agent: false
created: 1970-01-01T00:00:00.061Z
---
# Let a Proposal be rejected without feedback, in the shared operation and the command line

Rejecting an open Proposal works whether the feedback is given, empty or only blank. With text, the Proposal is rejected and a Feedback section with that text is added; without it, the Proposal is rejected and no Feedback section, not even an empty one, is added. The command line no longer requires the feedback option. Rejecting a Draft or a Proposal that is not open is still refused.
