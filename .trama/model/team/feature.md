# Team

How a developer who leads a team plans work for people, not only for the agent. With Manager mode on, the developer is also the Manager: he keeps in his editor the people of his team, with their GitHub handle, level, skills, capacity per sprint and absences, and the Team view of the panel shows them (see the Panel). The people may or may not use Trama: nothing in Team expects them to, and what Team gives them never needs Trama to be read.

The Team view is also where anyone, Manager or not, checks the open pull requests of the repository against the Model before they are merged (see the PR Check): without Manager mode, that is all the Team view shows.

The Manager gives work to people with a handoff: he writes a request, the agent turns it into a lighter kind of Proposal that carries GitHub issues instead of Tasks, with the assignee, the reviewer, the estimate in days and the one-week sprint it proposes for each, and the Manager previews, adjusts and approves it in the Team view. On approval the agent publishes the issues on the project's repository and on its GitHub Project (see the Proposal, the Issue and the GitHub project). Handoffs and issues never show on the Board, which stays the agent's work: too many cards would confuse the people, and the Team view shows them apart.

When it plans a handoff, the agent counts in each person's load both the work already on GitHub and the issues of the other handoffs still waiting for the Manager. Handoffs written one after the other can still add up to a plan that is not the best one, so before approving the Manager can ask the agent to replan together, with Replan, the sprints, people and estimates of the issues of all the open handoffs, keeping his own changes (see the Proposal).

Trama reads GitHub itself only to read, through the GitHub command line of the Manager; whatever changes on GitHub is written by the agent.

Once the issues are published, Trama follows them on GitHub and gives the Manager a roadmap in time: the weekly sprints of the Project, with each person's issues and load against their capacity, and signals where the plan does not hold (an issue behind the Model, a sprint ended with work still open, a dependency that cannot be met, a person with too much work). For published issues Trama only signals: the Manager replans them by hand, on GitHub. When an issue is closed, the Manager can have the agent compare its part of the Model with the code the team wrote.

What Trama knows about people stays in the Manager's editor, never in the project nor in git: it holds the same with Solo mode on or off, and nobody else sees it. The list of people is one for all the Manager's projects, and each project chooses who is in its team, so the same person can work on several projects.

Manager mode belongs to one working copy, like Solo mode, and needs the project's repository on GitHub, because the work for people lives on GitHub.
