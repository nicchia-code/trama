# Proposal

A change to the Model and its Requirements suggested by the agent, with the full new version of every file it touches and the files it removes. It has no effect until the developer approves it. Approved, rejected and discarded Proposals stay as history.

A Proposal is created by the agent as a Draft, either as an ordinary change or as an import that describes existing code. It may be written on top of other Proposals that are drafts, open or approved (never rejected or discarded ones); it is then drawn, checked and approved on top of them. Only when the agent has finished writing it does the agent hand it over, and only then does it await the developer.

## States

### Draft (initial)
The agent is still writing it. The developer cannot approve or reject it, and it is not counted among what awaits a decision: an approval or a rejection attempted now is refused, saying the Proposal is still being written. The same holds for the acceptance of a Drift's attached Proposal. Proposals that require it stay blocked.
- `agent.SUBMIT_PROPOSAL` → Open: only if the Proposal would be valid once applied and every file it holds was registered with it. Being stale or waiting for other Proposals does not prevent the hand-over. If it is refused, the Proposal stays Draft and the agent is told what to fix.
- `agent.EDIT_PROPOSAL` → Draft: the agent registers, rewrites or marks for deletion a file; nothing else changes.
- `developer.DISCARD_PROPOSAL` → Discarded: the developer gives up a draft the agent never finished; no feedback is asked. Proposals that require it are not discarded; they stay blocked, saying it was discarded.

### Open
Waiting for the developer, who may now see it, approve it or reject it. It may be blocked: while it is, an approval is refused and the Proposal stays Open, saying why. It is blocked when any Proposal it requires, directly or through others, is not approved yet, was rejected or discarded, does not exist or requires it back in a cycle; when it is stale, because a file it touches changed since the Proposal first recorded it (on top of the Proposals it requires); when some file it holds was never registered with it; or when the Model and Requirements with it applied would be invalid, for example a Requirement section pointing at a State that no longer exists. Nothing prevents approving a Proposal that touches no file.
- `developer.APPROVE_PROPOSAL` → Approved: only if the Proposal is not blocked. Copies its files into the Model and Requirements, removes the files it deletes, and regenerates the Requirement skills for the agent.
- `drift.PROPOSAL_ACCEPTED` → Approved: the developer accepted a Drift's attached Proposal; the same conditions and consequences as a direct approval.
- `developer.REJECT_PROPOSAL` → Rejected: appends the developer's feedback to the Proposal when there is any; feedback is optional and a blank one adds nothing. Proposals that require it are not rejected; they stay blocked, saying it was rejected.
- `drift.PROPOSAL_REPLACED` → Rejected: the agent attached a newer Proposal to the Drift in place of this stale one; appends the feedback that it was replaced by that Proposal. It is the one rejection that does not come from the developer. Proposals that require it are not rejected; they stay blocked, saying it was rejected.
- `agent.EDIT_PROPOSAL` → Draft: the agent changes a file of a Proposal it had handed over. It is withdrawn from the developer until the agent hands it over again.

### Approved (final)
Part of the Model now.

### Rejected (final)
Turned down, by the developer or because a newer Proposal replaced it on a Drift. The agent answers with a new Proposal rather than patching this one.

### Discarded (final)
Given up before the agent finished writing it. Nothing is asked of the agent; it may write a new Proposal if the change is still wanted.

## Events

### APPROVED
Emitted when the Proposal becomes part of the Model. Whatever must follow reacts to it: the Requirement skills are regenerated, and for an ordinary change a scan of the Features it affects may be started. For an import Proposal no scan follows, because the Model it adds already matches the code.
