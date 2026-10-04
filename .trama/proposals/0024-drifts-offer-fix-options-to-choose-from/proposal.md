---
status: approved
base:
  model/work/drift.md: new
  requirements/data.md: c30677006182a085032a7b2e89e0e9b84b7985b9a171c9574f44bb933d1ce883
  requirements/rules.md: 52c93a6d3269051d4dd59c9090db5d4a507f87735a546511579596e0140dc265
  requirements/ui.md: 63121ea82823321c465b0fc5c3b2b3e3884c2a6160f79757cb2ce190d05aee86
  requirements/tech.md: 195bd9febf0717853b734e39e83daab4bd0922796bb583ac774879c9d95e0a58
  work/drift.md: 3a060fde6d4802b89b13089f70a1d48a8866c154f92477ae498503c53f179269
delete: []
---
# Drifts offer fix options to choose from

The developer must always be able to choose among several ways to fix a Drift. Each Drift now carries two to five fix options written by the agent; keeping what should happen requires picking one, with an optional note, and the Task created carries it. Decisions taken without asking, to check: the note applies only to fixing the code; at most five options; the first option is the recommended one; open Drifts that already exist without options keep the plain Keep this; the CLI keeps --accept-proposal and --dismiss and adds --option and --note for --fix-code; with --fix-code and no --option an interactive terminal asks, otherwise it is refused; CLI option title and text are given as --option and --option-text pairs.
