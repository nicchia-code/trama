# Team

How a developer who leads a team plans work for people, not only for the agent. With Manager mode on, the developer is also the Manager: he keeps in his editor the people of his team, with their GitHub handle, level, skills, capacity per sprint and absences, and the Team view of the panel shows them (see the Panel). The people may or may not use Trama: nothing in Team expects them to, and what Team gives them never needs Trama to be read.

The Manager gives work to people with a handoff: he writes a request, the agent turns it into a lighter kind of Proposal that carries GitHub issues instead of Tasks, with the assignee, the reviewer, the estimate in days and the one-week sprint it proposes for each, and the Manager previews, adjusts and approves it in the Team view. On approval the agent publishes the issues on the project's repository and on its GitHub Project (see the Proposal, the Issue and the GitHub project). Handoffs and issues never show on the Board, which stays the agent's work: too many cards would confuse the people, and the Team view shows them apart.

Trama reads GitHub itself only to read, through the GitHub command line of the Manager; whatever changes on GitHub is written by the agent.

What Trama knows about people stays in the Manager's editor, never in the project nor in git: it holds the same with Solo mode on or off, and nobody else sees it. The list of people is one for all the Manager's projects, and each project chooses who is in its team, so the same person can work on several projects.

Manager mode belongs to one working copy, like Solo mode, and needs the project's repository on GitHub, because the work for people lives on GitHub.
