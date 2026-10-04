---
column: done
technical: true
refs:
  - requirements/tech#announcement
  - requirements/rules#announcement
drift: null
proposal: null
agent: false
---
# Teach the skills that create cards to announce them

The agent skills tell the agent to announce each card as soon as it knows it will create it and to pass the announcement's ID when it creates it.

- trama-design: for each Proposal it writes after the first one; the first is announced by Trama on the request.
- trama-fix and trama-scan: for each Task and each Drift.
- trama-import: for each Proposal.
- trama-implement: for the Drift it files.
- Each skill adds the announce command and tool, and the announcement option of the commands that create a card, to its tools table, and says never to wait for the announcement to show before going on. The shipped copies and the ones installed in the project are the same.
