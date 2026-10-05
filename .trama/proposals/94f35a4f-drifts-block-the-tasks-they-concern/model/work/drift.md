# Drift

A difference the agent found between the code and the Model, or between the code and a Requirement, that the developer must decide on. By default the code is fixed; the agent attaches a Proposal only when the code handles an important case the Model forgot.

A Drift is created Open by the agent and always points to at least one Model element or Requirement. A Drift the agent files while implementing a Task remembers that Task, its origin.

While it is Open a Drift blocks Tasks, because the work on them would be built on a difference nobody has decided yet. It blocks its origin Task, if any, and every Task not yet Done that concerns the same thing: the same element or one inside the other, counting the Requirements that apply to an element as part of it (a Requirement's General section counts only for the Tasks that name it). A Drift found by a Scan or a Fix has no origin and blocks only the Tasks that concern the same thing. A Drift that no open Task concerns blocks nothing. A blocked Task cannot be started by the agent; see the Task.

## States

### Open (initial)
Waiting for the developer's decision.
- `developer.FIX_DRIFT_CODE` → Code to be fixed: creates a Task in To do that points to the same elements and carries the Drift's description; the Task is a Technical Task when the Drift points only to Requirements. The origin Task, if it is not Done, goes back to To do and stays blocked until the Task created here is Done.
- `developer.ACCEPT_DRIFT_PROPOSAL` → Proposal accepted: only if a Proposal is attached to the Drift and that Proposal can still be approved; the attached Proposal is approved as if the developer had approved it. If it cannot be approved (still being written, rejected, discarded, already approved, stale, invalid or waiting for others) nothing changes and the Drift stays Open. The Tasks it blocked are free again.
- `developer.DISMISS_DRIFT` → Dismissed: closes the Drift with no change to code or Model. The Tasks it blocked are free again.

### Code to be fixed (final)
The developer decided the Model or the Requirement is right. The Task created for it carries on the work. The other Tasks it blocked are free again; its origin Task waits for the Task created here.

### Proposal accepted (final)
The developer decided the code is right and the Model changed to match it.

### Dismissed (final)
The developer chose to ignore the difference.

## Events

### PROPOSAL_ACCEPTED
Emitted when the developer accepts the Proposal attached to the Drift. The Proposal reacts as if it had been approved directly.
