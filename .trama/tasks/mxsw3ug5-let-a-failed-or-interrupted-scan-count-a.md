---
column: done
technical: false
refs:
  - drift-resolution
  - drift-resolution/In attesa delle scansioni/agent.FINISH_CHECK
  - drift-resolution.SCAN_BARRIER_CLEARED
  - drift-resolution/Free/developer.SET_DRIFT_AUTOPILOT
  - requirements/rules#drift-resolution
  - requirements/data#drift-resolution
  - requirements/quality#drift-resolution
  - requirements/rules#announcement
  - requirements/ui#agent-launching
drift: null
proposal: 8osh2q6r
agent: false
created: 2026-10-11T04:40:48.470Z
finished: 2026-10-11T04:53:25.669Z
---
# Let a failed or interrupted scan count as finished for the autopilot

The autopilot's delegation is no longer suspended by a scan that failed (check declared failed) or was interrupted (its work ended without a successful check). Such a scan counts as finished: when no other scan or Run is in progress the barrier clears and the collection starts on the eligible open Drifts, exactly as after a successful scan, even if the scan filed only some of its Drifts. A failed scan during a collection does not stop it or the later ones. The scan is not retried and no new notice is shown; the last failed scan is only information in the autopilot status, without changing the phase. Waiting after the editor opens or the coordinator is lost is lifted by a finished scan with any outcome, or by Resolve Drifts. Failed or excluded Drift and Task cases stay excluded as today. The description of the setting says that a failed or interrupted scan does not suspend the delegation.
