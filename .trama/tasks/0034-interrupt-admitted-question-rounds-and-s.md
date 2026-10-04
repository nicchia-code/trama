---
column: done
technical: false
refs:
  - question-round/Interrupted
  - question-round/Queued/editor.DISCONNECTED
  - question-round/Asking/editor.DISCONNECTED
  - editor.DISCONNECTED
  - requirements/data#question-round
  - requirements/rules#question-round
  - requirements/tech#question-round
drift: null
proposal: "0013"
agent: false
---
# Interrupt admitted question rounds and stop their workflows when the editor is lost

When an editor closes or becomes unreachable after a validated round has been submitted to it, interrupt every incomplete active or queued round assigned to that window. Close any remaining controls, remove those rounds and discard all their choices, free text and skips; return no partial answers or invented recommendations. Distinguish this interruption from initial editor unavailability and from the caller stopping its own wait. Waiting agent tools receive an error identified as editor-interrupted with its message; the CLI returns the same error as JSON and exits with failure, keeping diagnostics off stdout. End the affected waiting operations without a response timeout, without rerouting, retrying or resuming those rounds, and without ending unrelated requests or rounds in other windows. The design, fix and import skills stop the workflow awaiting those decisions on this interruption, with no question-interface fallback; retain the existing fallback only for initial editor unavailability. This adds the editor-loss behavior approved in Proposal 0013; request admission, private routing, question presentation and caller cancellation remain covered by Tasks 0030–0033, and the existing primary-question-interface discrepancy remains Drift 0001.
