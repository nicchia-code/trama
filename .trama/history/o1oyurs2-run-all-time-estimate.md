---
created: 2026-10-24T16:44:14.288Z
updated: 2026-10-24T16:44:14.288Z
summary: While a Run all of the window works, the disabled Run all button shows how many minutes or hours are left, estimated by Trama alone; sub-agent merges are recorded as orders so the estimate sees them.
tasks:
  - nqwjne3p
  - jz9q6bjr
  - sz5n5wag
---
# Run all time estimate

Trama estimates the time left of a Run all from the plan the run recorded, the Tasks that remain and the duration of finished Tasks, without any model. The host sends the result to the Board in the snapshot, refreshed on every change under .trama/ and every minute, and the Run all button shows it in place of its name, or says the Run is taking longer than expected. The Parallel execution part of the trama-implement skill now records every merge of groups as orders, so the chain of one sub-agent enters the estimate.
