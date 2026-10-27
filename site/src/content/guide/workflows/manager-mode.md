---
title: "Manager mode and Team"
description: "Plan work for the people of a team, publish it as GitHub issues and follow it on a timeline."
order: 12
---

> **Experimental.** Manager mode and Team are still taking shape: what they show, how handoffs and issues work and the settings they use may change from one release to the next.

**Manager mode** is for a developer who leads a team. Besides the agent, work can then be planned for people. The people may or may not use Trama: nothing in Team expects them to, and what Team gives them never needs Trama to be read.

Manager mode needs the project's repository on GitHub, because the work for people lives there. Check that the remote called `origin` points to GitHub and that the GitHub CLI is installed and logged in with access to Projects (`gh auth login --scopes project`). Trama only reads through `gh`; whatever changes on GitHub is written by the agent.

```step
title: Turn Manager Mode on
text: |
  Check **Manager Mode** in the **Project** group of Settings, or in the **Project** step of the setup wizard; under the checkbox, `Repository: <owner>/<repo> · origin on GitHub` shows what Trama found, and without a GitHub origin the setting is off and says why. The mode belongs to one working copy, like Solo mode.
scene: manager-settings
alt: "The Project group of Settings with Manager Mode checked and the line Repository acme/shop, origin on GitHub under it, and a Team entry now present in the side menu after History."
eager: true
```

```step
title: Open Team
text: |
  The side menu now has a **Team** entry after **History**, with a badge when handoffs wait for a decision.
scene: team-menu
alt: "The Board with Trama's side menu listing Board, Diagram, Requirements, Specs, History and the new Team entry, with the Merge button at the bottom."
```

```step
title: See the people
text: |
  The **People** tab lists the people of the team with their GitHub handle, level (`Junior`, `Mid` or `Senior`), skills, capacity per sprint and next absence. **Add from other projects** brings in people you keep for other projects.
scene: team-people
alt: "The People tab of the Team view listing two people, Ana Rossi and Marco Bianchi, each with level Mid, skills, a capacity of 5 days per sprint, next absence and edit actions, with Add from other projects and Add person above the table."
```

```step
title: Add a person
text: |
  Press **Add person** and fill in the name, GitHub handle, level, capacity per sprint, skills and absences, then **Save**. What Trama knows about people stays in your editor, never in the project or git, so nobody else sees it.
scene: team-person-dialog
alt: "The Add person dialog over the dimmed Team view with the name Ana Rossi, the handle acme-ana, level Mid, a capacity of 5 days, the skills TypeScript and payments, an Add absence link, and Cancel and Save buttons."
```

```step
title: Start a handoff
text: |
  A **handoff** gives work to people: in the **Decisions** tab press **New handoff** and write the request, as for a design request. The agent turns it into a lighter kind of Proposal that carries GitHub issues instead of Tasks, counting each person's load.
scene: team-decisions
alt: "The Decisions tab of the Team view with the message No handoff waits for a decision, the New handoff and View published issues buttons, the tabs Decisions, Issues, Timeline and People, and the Refresh button."
```

```step
title: Decide on the handoff
text: |
  The handoff waits in **Decisions** as a card with its epic and `Creates 2 issues`. **Approve** publishes the issues on the repository and on its GitHub Project; **Reject** and **Rework with feedback…** work as for any Proposal.
scene: team-handoff
alt: "The Decisions tab with one handoff card, Gift cards, marked with an epic chip and the line Creates 2 issues, with Approve and Reject buttons, the Replan and New handoff buttons above it and a badge 1 on the Team entry."
```

The agent counts the work already on GitHub and the other handoffs waiting for you in each person's load. Handoffs written one after the other can add up to a plan that is not the best. **Replan** asks the agent to plan sprints, people and estimates again for all the open handoffs together, keeping your own changes. Handoffs and issues never show on the Board, which stays the agent's work.

```step
title: Preview each issue
text: |
  Open the card to preview each issue exactly as it will be published, and change the assignee, reviewer, estimate or sprint. The preview shows the person's load against capacity, and an estimate over three days is flagged.
scene: team-handoff-preview
alt: "The preview of the first issue of a handoff, Gift card checkout screen, with its body on the left and the Assignee, Reviewer, Estimate in days and Sprint fields on the right, each marked as proposed by the agent, and Approve and Reject at the top."
```

```step
title: Follow the issues
text: |
  The **Issues** tab lists published issues by epic, in the order of their dependencies, with their status (`Open`, `In progress`, `In review`, `Closed`, `Not planned`) and signals where the plan does not hold: `Stale`, `Carry-over`, `Overload` and others. For a published issue Trama only signals: replan it by hand on GitHub.
scene: team-issues
alt: "The Issues tab of the Team view showing two issues of the epic Gift cards, number 13 In progress and number 14 Open, each with its assignee, sprint and an Open on GitHub link."
```

```step
title: Follow the timeline
text: |
  The **Timeline** tab is a roadmap of the Project's weekly sprints, **By person** or **By epic**, with each person's load against capacity and their absences. **Scan** on a closed issue has the agent compare the part of the Model that issue referenced with the code the team wrote.
scene: team-timeline
alt: "The Timeline tab of the Team view with a By person and By epic toggle, a grid of the sprints Sprint 2 (current) to Sprint 5 for Ana Rossi and Marco Bianchi with their issues as blocks and the load such as 3 of 5 days, and a hatched No iteration column."
```
