---
status: resolved
resolution: dismissed
refs:
  - announcement
proposal: null
task: null
origin: p3zcrvmt
option: null
note: null
created: 2026-10-23T21:09:58.074Z
job: d2ab117d-f663-4230-b750-6dbc790a74f5
---
# Ask more notice on withdrawal

## What happens

When Ask more ends, its waiting work card disappears without any notice, as the Model says for a work.

## What should happen

The Task text says the pending announcements of Ask more are withdrawn with the notice that delivery was missed. The Model says a work disappears without notices, so the two cannot both be followed.

## Fix options

### Keep silent as the Model says

The work card disappears without a notice, as the Model states. The Task's notice requirement is dropped. Nothing changes in the Model or the code, and the developer gets no hint that Ask more ended without a delivery.

### Show the notice by a Model change

A Proposal changes the Model so that a withdrawn work also shows the delivery-missed notice. The code then has to show that notice when Ask more ends or its terminal closes. It costs a Model change and a small amount of code in the announcement withdrawal path.

## Where in the code

extension/src/host/announcements.ts: withdrawWaiting filters out work announcements from the notice; extension/src/host/agent.ts: withdrawal when the agent terminal ends
