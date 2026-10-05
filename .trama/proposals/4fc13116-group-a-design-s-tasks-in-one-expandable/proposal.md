---
status: approved
base:
  work/task.md: e08bf12de018ceadd52a0dbc74789c25656a3510d0b0cdc73b9559cf97cac9cc
  editor-panel/panel.md: be0ed0c972ea4b1a3a6ed04de46b7e174cf19360d72d4a2e4282d39dd5322e76
  actors/developer.md: 23f3e08ac92360270b69bc96824bc165af89a435f9c491c1057ba907bc1e3366
  agent-launching/agent-terminal.md: 444c72d918b389f0e3fa8213b90fe75ed104e87331805c2392f70f8c1d0009ae
  requirements/data.md: bca9bc98aaf4b4b3c7d31f58a3d25624e98b7c53727a8b08843e7b726e23f953
  requirements/rules.md: 1a2b6f8631a5a88c765cdaa7365a8c3c8af795d65fef6371e148df297796db8a
  requirements/ui.md: bd7c58ec1e30337f5c42e5448bb9c2ccc911a5b4c8587569e20733fa9e0a9249
delete: []
created: 1970-01-01T00:00:00.007Z
---
# Group a design's Tasks in one expandable Board card

The developer expresses a design, it is approved as a Proposal, and the Scan splits it into many Tasks. The Board should show those Tasks as a single card per design that can be expanded. Decisions confirmed with the developer: Tasks link explicitly to the Proposal they come from; one card per design with a column derived from its Tasks, status dots on the sub-items, collapsed by default and remembered during the session; a 'Run this design' action; Tasks without a Proposal and designs of a single Task stay plain cards; the textual board groups, the Task list stays flat. Choices to check: the linked Proposal may have any status; chained Proposals give separate groups; Run this design is disabled without To do Tasks; existing Tasks, manual Scans, Technical Tasks and Drift fixes stay ungrouped; the trama-scan skill must be updated to pass the link (technical work, not Model).
