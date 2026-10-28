---
title: "Manager mode and Team"
description: "Plan work for the people of a team, publish it as GitHub issues, follow it on a timeline, and check a pull request against the Model."
order: 12
---

> **Experimental.** Manager mode and what it adds to Team, the handoffs, the issues and the timeline, are still taking shape: what they show, how they work and the settings they use may change from one release to the next. The PR Check, at the end of this page, is not part of it.

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

## PR Check

The **PR Check** is for checking a pull request of someone else against the Model before it is merged, without touching the folder you work in. Anyone can do it, with or without Manager mode, in a project whose repository is on GitHub. It needs the GitHub CLI (`gh`) logged in to github.com, and never needs access to Projects: Trama only uses `gh` to read the pull requests, and the PR Check writes nothing to GitHub.

The PR Check lives in the **Pull Requests** tab of the Team view. With Manager mode off, that is the only tab, and the **Team** entry of the side menu is there as soon as the remote called `origin` points to GitHub. The tab lists the open pull requests that are ready for review, the highest number first, so a draft is left out. Each row has the number, the title, the author, the branch it goes into and the branch it comes from, and its state: `Not checked`, `Checking…` or `Checked <time ago>`, with the badge `Outdated` when the pull request has new commits since. Trama reads the list when the view is shown and with **Refresh**, never on a timer.

Press **Check** on a pull request (**Check again** once it has a report). Trama picks the way it works by itself:

- **Solo**, when Solo mode is on, or when the pull request has no `.trama/` folder: the others do not use Trama, so the only Model is the one of your open folder. Trama copies its own files of that folder (the Model, the Requirements, the Specs, the cards and what it installs for the agent) into the worktree, and the scan marks as coming from the pull request every Drift whose code lies in a file the pull request changed since it left the branch it goes into.
- **Collaborative**, when Solo mode is off and the pull request has a `.trama/` folder: the pull request brings its own Model. Trama first compares the Model at the point where the pull request left the branch it goes into with the one at its head, element by element, and checks that Model; then the agent scans the code against the Model of the pull request.

The pull request is taken as it is, at its head, with no merge, into a git worktree that Trama creates in the editor's private folder for the workspace, never in the project. Your open folder, its Board, its last scan and everything Trama keeps locally stay as they are, and `git status`, `git branch` and `git worktree list` show what they showed before. The agent works in that worktree and scans the whole System, like **Scan System**: it costs, and that is wanted. It is told not to run, build or install anything of the pull request, and the cards it files stay in the worktree, never on your Board. When it has finished, Trama gathers the result into a report and removes the worktree.

**Report** opens the report in a window: a table with the columns `Section`, `Reference`, `Finding`, `Source` and `Where in the code`, its rows grouped by section. `Code` holds what the scan found, in both ways: a Task for what the Model asks and the code lacks, and a Drift for every difference. In Collaborative, Trama's own checks add `Model`, one row for every element of the Model, section of the Requirements and field of the Specs the pull request adds, changes or removes; `Model problems`, for the errors of the Model of the pull request, for the files of the Model changed without an approved Proposal and for what the branch it goes into also changed; and `Open work`, for the Proposals, Tasks and Drifts the pull request brings that are still open. When nothing differs, the window says `No differences found.`

The report is informative: it never decides anything, never reaches GitHub and is never committed. It stays only in your working copy, one per pull request, and the next check of the same pull request replaces it. When the pull request gets new commits the report is marked `Outdated`, and when the pull request is no longer open and ready for review, because it was merged, closed or went back to draft, Trama deletes its report.

**Stop**, in the row while the PR Check works, ends the agent and removes the worktree without writing any report. A PR Check that fails, stops, or ends without the agent delivering its scan leaves the previous report as it was. Only one PR Check runs at a time in a window, and **Check** is disabled, with the reason as its tooltip, while another PR Check or a Run launched from this window is in progress, and after a failed read of GitHub. A worktree left over by a window closed during the check is removed the next time the project opens.
