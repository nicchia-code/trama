---
description: "Use when building the Pull Requests tab of the Team view, the report window of a PR Check and its messages."
---
# PR Check

## pull-request-check
- Team view: the tab `Pull Requests` comes right after `Issues` with Manager mode on. With Manager mode off the tab bar holds only `Pull Requests` and the title's line has no GitHub Project button, only `Updated …` and `Refresh`.
- Without Manager mode the GitHub states of `ui#github-project` show without `GitHub CLI can't read Projects`, and their texts name pull requests instead of the Project: `Team uses gh to read the pull requests. Install it, then select Refresh.` and `Log in so Trama can read the pull requests of <owner>/<repo>. This runs gh auth login in a terminal.`; a failed read is titled `Couldn't read the pull requests`.
- Header of the tab, in secondary text: `<n> open pull requests ready for review` (`1 open pull request…`).
- One row per pull request, the highest number first: `#<n>` in monospace, the title in medium weight and, under it in secondary text, `<author> · <base branch> ← <head branch>`.
- Status of the row, as a pill with an icon: `Not checked` (dashed border, lucide `CircleDashed`); `Checking…` (lucide `LoaderCircle`, turning, removed with `motion-reduce`); `Checked <time ago>` (lucide `CircleCheck`) and, when the report is outdated, a badge `Outdated` (amber, lucide `Clock`) with the tooltip `New commits since this check`.
- Actions, aligned right: `Check` (`outline`, lucide `ScanSearch`), or `Check again` when a report exists; while the PR Check of that row runs, `Stop` (`outline`, lucide `Square`) in its place. `Report` (`ghost`, lucide `Table`) when a report exists. `Open on GitHub` icon-only (`ghost`, lucide `ExternalLink`, tooltip `Open on GitHub`).
- `Check` is disabled, with the reason as tooltip: `A PR Check is running` while another PR Check of this window runs; `A run is in progress` while a Run launched from this window is in progress; `Can't read GitHub` after a failed read.
- No pull requests: `No open pull requests ready for review.` in secondary text.
- Narrower than 640 px each row becomes a block: number and status on the first line, title and branches below, actions at the right of the first line.
- The job's terminal, or its conversation of omp Chat, is named `PR #<n>`; its ghost in the status bar is titled `Checking PR #<n>`.
- Messages of the editor: a preparation that fails, error `Trama: could not check #<n>: <reason>.`, with git's or gh's first line of error, never the whole output; a job that ends without delivering its scan, warning `Trama: the PR Check of #<n> did not finish. The previous report, if any, is kept.`; a worktree that cannot be removed, error `Trama: could not remove the worktree of #<n>: <reason>.`. Stop shows nothing.

## pull-request-report
- `Report` opens a shadcn/ui `Dialog` over the view, up to 960 px wide, titled `#<n> · <title>`; under the title, in secondary text, `Checked <date and time> on <short head commit> · Solo` or `· Collaborative` and `<base branch> ← <head branch>`. When the report is outdated, a line in the warning colour with lucide `Clock`: `The pull request has new commits since this check.`
- A bordered table with the columns `Section`, `Reference`, `Finding`, `Source` and `Where in the code`. Rows are grouped by section, in the order `Model`, `Model problems`, `Code`, `Open work`: each group starts with a row on the muted background with the section's name and `<n>` in secondary text; a section with no rows is not shown.
- `Reference` is a chip like the references of the cards; it opens its focus in the Diagram, the Requirements or the Specs only when the reference exists in the open folder, otherwise it is plain monospace text. `Where in the code` is monospace text; an empty cell shows `–`.
- A report with no rows shows, instead of the table, lucide `CircleCheck` and `No differences found.`
- At the bottom: `Open on GitHub` (`outline`, lucide `ExternalLink`) and `Close`. Escape closes the window.
- Narrower than 640 px each row of the table becomes a block: reference and source on the first line, the finding below, `Where in the code` last.
- Everything is reachable from the keyboard with a visible focus ring; the table has a header row for assistive technologies; state is never told by colour alone.
- All these texts are in English and do not follow `trama.language`; the findings that come from the scan are the agent's text, in the language it wrote them.
