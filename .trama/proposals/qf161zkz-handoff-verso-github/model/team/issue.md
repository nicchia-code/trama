# Issue

A piece of work for a person of the Manager's team. It is born when the Manager approves the handoff that carries it (see the Proposal) and lives on GitHub, as an issue of the project's repository and an item of the linked GitHub Project (see the GitHub project). Trama keeps a card of it in the project, with what the agent wrote, the fields as they were published, the Model elements and Requirement sections it is about and the version of their text when it was published, so that Trama can later tell whether the Model changed under it. The card follows Trama's other files: with Solo mode on it stays only in the working copy.

The person who does the work never needs Trama: everything they need is in the issue. The agent writes the body for that person, in the language Trama's instruction asks for, as a self-contained text: why the work is needed, what happens now and what should happen, the acceptance criteria as a task list, a diagram of the Machine when it helps, where in the code, what stays out and how to verify. It adapts the detail to the level of the assignee: more context and suggested steps for a junior, objective, constraints and criteria for a senior. It never carries images. The reviewer is named in the body, since a GitHub issue has no reviewer of its own, and also in the Project's field for it when the Project has one. Except with Solo mode on, where nobody else has Trama's files, the body ends with a folded block that lists the Model elements and Requirement sections it is about, for whoever uses Trama; outside it, nothing in the issue refers to Trama.

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

### Published
The issue is on GitHub, with the number and the address the agent recorded.
