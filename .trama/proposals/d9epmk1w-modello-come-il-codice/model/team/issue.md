# Issue

A piece of work for a person of the Manager's team. It is born when the Manager approves the handoff that carries it (see the Proposal) and lives on GitHub, as an issue of the project's repository and an item of the linked GitHub Project (see the GitHub project). Trama keeps a card of it in the project, with what the agent wrote, the fields as they were published, the Model elements and Requirement sections it is about and the version of their text when it was published, so that Trama can later tell whether the Model changed under it. The card follows Trama's other files: with Solo mode on it stays only in the working copy.

The person who does the work never needs Trama: everything they need is in the issue. Trama assumes that the people of the team work with a coding agent of their own, so the agent writes the body in two parts, in the language Trama's instruction asks for, as a self-contained text. The first part is for the person and holds everything needed to understand the work: why the work is needed, what happens now and what should happen, the acceptance criteria as a task list, what stays out and how to verify. The second part, clearly labelled as being for the agent, holds the technical side: where in the code, with the files and excerpts of the code involved, a diagram of the Machine when it helps, the suggested steps and the context only an agent needs; it points to the acceptance criteria of the first part instead of repeating them. The contents are the same as in a body of one part, only divided. It adapts the detail of both parts to the level of the assignee: more context and suggested steps for a junior, objective, constraints and criteria for a senior. It never carries images. The reviewer is named in the body, since a GitHub issue has no reviewer of its own, and also in the Project's field for it when the Project has one. Except with Solo mode on, where nobody else has Trama's files, the body ends, after both parts, with a folded block that lists the Model elements and Requirement sections it is about, for whoever uses Trama; outside it, nothing in the issue refers to Trama.

The agent publishes the issues of a handoff in the order of their dependencies, so that an issue names the GitHub numbers of those it depends on. The issue carries the label of its epic, the handoff's label, which the agent creates in the repository when it is missing.

## States

### Publishing (initial)
Trama asked the agent to publish the issue and the agent is working on it. The Issues tab of the Team view shows it as being published.
- `agent.RECORD_ISSUE_PUBLISHED` → Published: the agent created the issue on GitHub, added it to the Project and set its fields, and recorded its number and address. Trama records the moment and the version of the text of its references. When some field of the Project could not be set, the agent records which, and the Issues tab says so.
- `agent.RECORD_ISSUE_FAILED` → Not published: GitHub refused to create the issue; the agent records the reason, which the Issues tab shows.
- `time.CHECK_DUE` → Not published: the agent that was publishing it is gone, its process or its terminal no longer exists, and it recorded nothing; the reason is that the agent stopped before publishing it. An issue that the agent created on GitHub without recording it is not found by Trama: the agent records each issue right after creating it.

### Not published
The issue is not on GitHub; the Issues tab says why and offers to publish it again.
- `developer.PUBLISH_AGAIN` → Publishing: only while Team is available and a GitHub Project is linked. Trama asks the agent to publish this issue and every other issue of the same handoff that is not published. If the instruction does not leave, nothing changes and the Issues tab says why.
- `agent.RECORD_ISSUE_PUBLISHED` → Published: the agent had created the issue on GitHub before Trama marked it not published (for example after the agent stopped, see `time.CHECK_DUE`), and it records the publication now, without a new attempt. Trama records the moment and the version of the text of its references, as in Publishing.
- `agent.RECORD_ISSUE_FAILED` → Not published: the agent records again that GitHub refused the issue, with the new reason, which the Issues tab shows.

### Published
The issue is on GitHub, with the number and the address the agent recorded. From here on Trama follows it by reading GitHub, when the Team view is shown and with Refresh: where the work is, the sprint and the estimate it has now in the Project, who it is assigned to, its pull requests. Trama never changes it on GitHub. A change made on GitHub by the team, a new assignee, another sprint or estimate, is what the Team view shows, and Trama's card keeps the published values only as history.

While the issue is open, Trama also tells the Manager what needs his attention (see the Panel): the Model changed under the issue since it was published (its references no longer read as they did); the sprint the issue is in has ended with the issue still open; the issue starts before an issue it depends on can be finished; its assignee has more work in that sprint than fits their capacity, absences counted. These are signals, never changes: replanning is the Manager's, on GitHub.
- `developer.ASK_ISSUE_UPDATE` → Published: only while the issue is open and the Model changed under it, with Team available. Trama asks the agent to write on the issue a comment that tells the person, in the language of the issue, what changed in the Model and the Requirements since it was published and what that means for the work; the body stays as it was. When the agent records the comment, the issue is no longer behind the Model, until the Model changes again. If the instruction does not leave, nothing changes and the Team view says why.
- `agent.RECORD_ISSUE_UPDATED` → Published: the agent wrote the comment and recorded it. Trama records the version of the text of the issue's references at that moment.

#### Open (initial)
The issue is open and nobody has started it yet.
- `github.WORK_STARTED` → In progress: the issue's status in the Project says the work is in progress, or a branch or a draft pull request is linked to it.
- `github.REVIEW_REQUESTED` → In review: a pull request that closes the issue is open and ready for review.
- `github.ISSUE_CLOSED` → Closed: the issue was closed as completed.
- `github.ISSUE_NOT_PLANNED` → Not planned: the issue was closed as not planned.

#### In progress
Someone is working on it.
- `github.REVIEW_REQUESTED` → In review
- `github.WORK_STOPPED` → Open: nothing says the work is in progress any more.
- `github.ISSUE_CLOSED` → Closed
- `github.ISSUE_NOT_PLANNED` → Not planned

#### In review
A pull request that closes the issue waits for the review of the team.
- `github.REVIEW_DROPPED` → In progress: the pull request was closed without merging or went back to draft, and the work is still in progress.
- `github.WORK_STOPPED` → Open: no pull request is open and nothing says the work is in progress.
- `github.ISSUE_CLOSED` → Closed: usually because the pull request was merged.
- `github.ISSUE_NOT_PLANNED` → Not planned

#### Closed
The work is done on GitHub. The Team view offers to have the agent compare the code of the issue's references with the Model: a difference becomes a Drift that leans towards fixing the code, because the issue said what had to happen.
- `developer.SCAN_ISSUE` → Closed: only with Team available and no Run launched from this window in progress. Trama asks the agent to compare with the code the Machines and Requirement sections the issue is about, and only those; the Drifts it files name the issue. If the instruction does not leave, nothing changes.
- `github.ISSUE_REOPENED` → Open: the issue was reopened on GitHub.

#### Not planned
The team decided not to do it. What it was about in the Model is still to be done or to be removed with another Proposal.
- `github.ISSUE_REOPENED` → Open
