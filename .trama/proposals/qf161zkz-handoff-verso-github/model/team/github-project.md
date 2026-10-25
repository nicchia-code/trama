# GitHub project

The GitHub Project where Team publishes the issues of this working copy and reads their sprints: one per working copy, chosen by the Manager in the Team view among the Projects of the owner of the repository, and recorded in the project in a place that stays local to the working copy, never committed, like Manager mode. Only a Project with an iteration field can be linked: its iterations are the sprints, one week each. Its other fields (status, priority, estimate, a reviewer, and any the team added) are the fields the agent proposes for every issue.

Trama reads the Projects, their fields and their iterations itself, through the GitHub command line the Manager has installed and logged in, and only to read: it never creates, changes or deletes anything on GitHub. Writing on GitHub is the agent's work. When the GitHub command line is missing, is not logged in, has not been given access to Projects or a read fails, the Team view says so and how to fix it, and keeps showing what it read last (see the Panel).

## States

### Not linked (initial)
No Project is linked: the Team view asks to link one before any handoff can be approved; handoffs can still be written and previewed.
- `developer.LINK_GITHUB_PROJECT` → Linked: the Manager chooses a Project with an iteration field. Trama records it and reads its fields and iterations. A Project without an iteration field cannot be chosen, and the Team view says why. If the write fails, nothing changes and the reason is shown.

### Linked
- `developer.LINK_GITHUB_PROJECT` → Linked: the Manager links another Project. From now on Team publishes there and reads from there; issues already published stay in the Project where they are.
- `developer.UNLINK_GITHUB_PROJECT` → Not linked: the Manager unlinks the Project. Nothing changes on GitHub.
