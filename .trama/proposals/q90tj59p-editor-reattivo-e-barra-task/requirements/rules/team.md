---
description: "Use when implementing when Manager mode is available, which GitHub repository a project is, and the rules on the people of the team."
---
# Team

## manager-mode
- The GitHub repository of a project is read from `git remote get-url origin` in the project's folder. Origin is on GitHub when its address is `https://github.com/<owner>/<repo>`, `http://github.com/<owner>/<repo>`, `git@github.com:<owner>/<repo>` or `ssh://git@github.com/<owner>/<repo>`, each with or without a final `.git` and a final `/`. The repository is `<owner>/<repo>` in lower case. Any other host, GitHub Enterprise included, counts as not on GitHub; no origin, no git or a failed git call counts as no origin remote.
- Team is available when Manager mode is recorded and origin is on GitHub. The Team view, with only its `Pull Requests` tab (`rules#pr-check`), is available in every Trama project whose origin is on GitHub, with Manager mode on or off; the tabs of the Manager, the GitHub Project and the number of handoffs need Team available. The repository is read once when the window opens the project and again whenever git's configuration of the project changes, so the side menu and the Team view follow a change of origin without reloading the window; an opening of the panel, a picture, or a show of the Team view or of the Settings tab never reads it again (`quality#General`).
- Turning Manager mode on without origin on GitHub is refused, from the Settings tab, the wizard and the command line, with the reason `Manager Mode needs a repository on GitHub (the origin remote).`
- Turning Manager mode off deletes only the Manager mode file: the people in the editor and every file of Team's work in the project stay.
- When Manager mode goes off while the panel shows the Team view, the view keeps only `Pull Requests` and shows it. When origin stops being on GitHub while the panel shows the Team view, the panel passes to the Board.

## person
- Name: 1 to 80 characters after removing spaces around, else `Enter a name of 1 to 80 characters.`
- GitHub handle: 1 to 39 characters in all: letters, digits and single hyphens, not starting or ending with a hyphen, optionally followed by an underscore and a shortcode of letters and digits (the form of GitHub Enterprise Managed Users accounts, such as `32984238_EYGS`); any other underscore is invalid. A leading `@` written by the Manager is dropped. A handle with a space gets `A GitHub handle can't contain spaces.`; any other invalid handle `Use 1 to 39 letters, digits, single hyphens and an optional _shortcode.` A handle another person already has gets `@<handle> is already in your list: add them from other projects.` Trama never checks on GitHub that the handle exists.
- Capacity per sprint: from 0.5 to 5, in steps of 0.5, else `Enter 0.5 to 5 days, in steps of 0.5.` A sprint is one week of five working days.
- Skills: at most 20, each 1 to 30 characters after removing spaces around; adding one equal to another without case adds nothing; more than 20 gets `At most 20 skills.`
- Absences: at most 50; each needs both dates, with `To` not before `From`, else `The end of an absence can't be before its start.`; a missing date gets `Enter both dates.` Absences that ended more than 90 days ago are dropped when the person is saved.
- The next absence of a person is the first one whose `To` is today or later; today is the local date of the editor.
- Adding a person puts the current project's repository in their `repositories`; `Remove from team` takes it out; `Add from other projects` puts it in; `Delete person` removes the whole person. A change to a person changes them in every project they are in.
- Only the extension reads and writes the people. The agent reads the members of the current project's team only through `trama team show` (`cli#team`), and nothing writes them but the Team view.
