# Drift

A difference the agent found between the code and the Model, or between the code and a Requirement, that the developer must decide on. By default the code is fixed; the agent attaches a Proposal only when the code handles an important case the Model forgot.

A Drift is created Open by the agent and always points to at least one Model element or Requirement.

## States

### Open (initial)
Waiting for the developer's decision.
- `developer.FIX_DRIFT_CODE` → Code to be fixed: creates a Task in To do that points to the same elements and carries the Drift's description; the Task is a Technical Task when the Drift points only to Requirements.
- `developer.ACCEPT_DRIFT_PROPOSAL` → Proposal accepted: only if a Proposal is attached to the Drift and that Proposal can still be approved; the attached Proposal is approved as if the developer had approved it. If it cannot be approved (rejected, already approved, stale, invalid or waiting for others) nothing changes and the Drift stays Open.
- `developer.DISMISS_DRIFT` → Dismissed: closes the Drift with no change to code or Model.

### Code to be fixed (final)
The developer decided the Model or the Requirement is right. The Task created for it carries on the work.

### Proposal accepted (final)
The developer decided the code is right and the Model changed to match it.

### Dismissed (final)
The developer chose to ignore the difference.

## Events

### PROPOSAL_ACCEPTED
Emitted when the developer accepts the Proposal attached to the Drift. The Proposal reacts as if it had been approved directly.
