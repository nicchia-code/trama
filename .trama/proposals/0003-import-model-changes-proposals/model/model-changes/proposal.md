# Proposal

A change to the Model and its Requirements suggested by the agent, with the full new version of every file it touches and the files it removes. It has no effect until the developer approves it. Approved and rejected Proposals stay as history.

A Proposal is created Open by the agent, either as an ordinary change or as an import that describes existing code. It may be written on top of other Proposals that are open or approved (never rejected ones); it is then drawn, checked and approved on top of them.

## States

### Open (initial)
Waiting for the developer. It may be blocked: while it is, an approval is refused and the Proposal stays Open, saying why. It is blocked when any Proposal it requires, directly or through others, is not approved yet, was rejected, does not exist or requires it back in a cycle; when it is stale, because a file it touches changed since the Proposal first recorded it (on top of the Proposals it requires); when some file it holds was never registered with it; or when the Model and Requirements with it applied would be invalid, for example a Requirement section pointing at a State that no longer exists. Nothing prevents approving a Proposal that touches no file.
- `developer.APPROVE_PROPOSAL` → Approved: only if the Proposal is not blocked. Copies its files into the Model and Requirements, removes the files it deletes, and regenerates the Requirement skills for the agent.
- `drift.PROPOSAL_ACCEPTED` → Approved: the developer accepted a Drift's attached Proposal; the same conditions and consequences as a direct approval.
- `developer.REJECT_PROPOSAL` → Rejected: appends the developer's feedback to the Proposal. Proposals that require it are not rejected; they stay Open and blocked, saying it was rejected.

### Approved (final)
Part of the Model now.

### Rejected (final)
Turned down. The agent answers with a new Proposal rather than patching this one.

## Events

### APPROVED
Emitted when the Proposal becomes part of the Model. Whatever must follow reacts to it: the Requirement skills are regenerated, and for an ordinary change a scan of the Features it affects may be started. For an import Proposal no scan follows, because the Model it adds already matches the code.
