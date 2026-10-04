---
column: done
technical: false
refs:
  - panel/Board
  - announcement/Preparing
  - announcement/Writing
  - requirements/ui#panel/Board
drift: null
proposal: "0020"
agent: false
---
# Draw the ghosts of announced cards on the Board and show the notices of withdrawn ones

The Board shows a ghost of each announced card in the column it will land in.

- To decide for a Proposal or a Drift, To do for a Task. The ghost is a dashed, translucent skeleton with a shimmer on its text lines; the shimmer stops when the system asks for reduced motion.
- It shows the kind (Proposal, Task or Drift), the title and a phase line: "Preparing" until a Draft exists, "Writing" once it does, and "Waiting for your answers" instead of either while a question round is open. The title is the developer's request until the Draft exists, then the Draft's title; both update by themselves.
- It stands after the real cards of its kind (Proposals before Drifts in To decide) and several keep the order in which they were announced. The real card takes its place when it arrives, without any other card jumping.
- It cannot be clicked, focused or dragged and has no buttons or links. Its accessible name says the kind, the title and the phase. It is left out of every column count and of the number on the Board tab.
- A Proposal being written is still not shown as a card.
- A withdrawn announcement that is not a discarded Draft leaves a notice at the top of the Board: "The agent finished without delivering <kind> <title>.", one per ghost, with a button to close it.
- Ghosts and notices are kept current while another tab is shown, and opening the panel again brings back the ghosts that still exist.
