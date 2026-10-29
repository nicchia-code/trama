---
description: "Use when implementing the PR Check: which pull requests it lists, how it chooses Solo or Collaborative, how it prepares and removes its worktree, the instruction to the agent and what goes into its report."
---
# PR Check

## pr-check
- Hidden for now: no surface offers the PR Check. The Team view has no `Pull Requests` tab, the host refuses `checkPullRequest` and `stopPullRequestCheck` without doing anything, Trama never runs `gh pr list` (neither when the Team view is shown nor at Refresh), never deletes reports and never launches a PR Check. The reports already in `.trama/pr-checks/` stay as they are, neither read nor deleted, and `.trama/pr-checks/` stays among Trama's local folders. The removal of leftover worktrees when a window opens the project (`rules#pull-request-check`) keeps running. The rest of this fragment, of `rules#pull-request-check` and of `rules#pull-request-report` describes the PR Check as it works when it is offered.
- The PR Check exists in a Trama project whose origin is on GitHub (`rules#manager-mode`), with Manager mode on or off, and needs the GitHub command line `gh` logged in to github.com. It never needs access to Projects.
- The pull requests are read with `gh pr list --repo <owner>/<repo> --state open --limit 100 --json number,title,author,isDraft,baseRefName,headRefName,headRefOid,url`, when the Team view is shown and with Refresh, never on a timer. Only those with `isDraft` false are listed, the highest number first.
- The way it works is chosen at Check, never stored: **Solo** when Solo mode is on (`rules#solo-switch`), or when the head of the pull request has no `.trama/` folder at the project's prefix inside the repository (`git ls-tree <head> -- <prefix>.trama` lists nothing); **Collaborative** otherwise.
- The point where the pull request left the branch it goes into is `git merge-base <base> <head>`, with `<base>` the commit of that branch fetched at Check and `<head>` the commit of the pull request fetched at Check.
- Trama's own files of a folder are: `.trama/` without its local folders (every folder of `.trama/` that holds a `.gitignore` containing `*`, such as `announcements/`, `compared/`, `last-scan/`, `manager/`, `solo/`, `timings/` and `pr-checks/`), the folder of the agent skills (`trama.skillsDir`, default `.agents/skills`), `.omp/agents/trama-analysis.md`, `.omp/agents/trama-implementer.md` and `.omp/WATCHDOG.yml`.

## pull-request-check
- `Check` is available on a listed pull request when no PR Check of this window is running, no Run launched from this window is in progress (`rules#agent-terminal`) and the last read of the pull requests succeeded. Otherwise it is disabled and says why (`ui#pull-request-check`).
- Preparation, in this order; the first step that fails stops the PR Check, removes what was created of the worktree and shows the reason:
  1. Fetch: `git fetch --no-tags origin refs/pull/<n>/head refs/heads/<base branch>`; the two commits are read from `FETCH_HEAD`. No local branch, tag or other ref is created or moved.
  2. Worktree: `git worktree add --detach <folder> <head>`, in the folder of `data#pull-request-check`; a folder already there is removed first as in the removal below.
  3. Solo: Trama's own files of the open folder are copied into the worktree, at the same paths, over whatever the head has there. Collaborative: Trama computes its checks of the report (`rules#pull-request-report`) on the head and on the merge-base, before the agent starts.
  4. Skills: the agent skills, the agent definitions and the advisor instructions of this version of Trama are written into the worktree, with the same code as the check at every opening (`rules#project`), also when the head brings older ones.
  5. Launch: the agent starts in the worktree, with the conditions of every launch (omp present, `rules#agent-launching`).
- Instruction, one line, followed by the usual sentences of every instruction except the one of the Async Drift Resolver, which never works in a PR Check:
  - Collaborative: "Use the trama-scan skill on the whole System. This is the PR Check of pull request #<n>, in a worktree of its own: file the cards here, and do not run, build or install anything of the pull request."
  - Solo: the same, followed by "A merge brought in `<merge-base>...<head>`: mark `merge` on every Drift whose Where in the code lies in a file `git diff --name-only <merge-base>...<head>` lists."
- The job uses the model role of the scan; its terminal, or its conversation of omp Chat, is named `PR #<n>`. At the launch Trama announces in the open folder a work (`data#announcement`) titled `Checking PR #<n>`, which ends with the job like any work.
- The scan was delivered when the check the agent announced for its scan in the worktree was moved to `delivered`; a check `failed`, withdrawn or never announced means the scan did not finish.
- At the end of the job (hook idle, end of turn, end of the command, terminal closed, execution check), Trama, in this order: reads the cards of the worktree and writes the report when the scan was delivered (`data#pull-request-report`), then removes the worktree. When the scan did not finish, nothing is written and the previous report stays.
- Stop: Trama closes the terminal, or ends the conversation, of the PR Check, then removes the worktree; nothing is written.
- Removal of the worktree: `git worktree remove --force <folder>`, then `git worktree prune`. When git cannot remove it, Trama deletes the folder and prunes; only when both fail it shows an error with git's reason.
- When a window opens the project, every folder in the PR Check's folder of the workspace that no running PR Check of an open window uses is removed as above, with no report and no message.
- The scan of a PR Check never writes `.trama/last-scan/system` of the open folder and never changes the number of `Scan System`; its cards never reach the open folder.

## pull-request-report
- One report per pull request; the report of a PR Check replaces the previous one of the same pull request.
- Rows of Trama's own checks, Collaborative only, computed between the merge-base and the head:
  - `Model`: one row per element of the Model, section of the Requirements and field of the Specs added, changed or removed, as `trama proposal show` lists the changes of a Proposal.
  - `Model problems`: one row per error of `trama model check` on the Model of the head.
  - `Model problems`: one row per file of `.trama/model/`, `.trama/requirements/` or `.trama/specs.yaml` changed by the pull request that is not among the files of a Proposal approved at the head and not approved at the merge-base; the finding is `Changed without an approved Proposal`.
  - `Model problems`: one row per element, section or field changed both between the merge-base and the head and between the merge-base and the commit of the branch it goes into; the finding is `Also changed on <base branch>`.
  - `Open work`: one row per Proposal in Draft or Open, Task in To do or In progress, and Drift open at the head whose file the pull request added or changed.
- Rows of the scan, in both ways: `Code`, one row per Task and per Drift the scan filed in the worktree. A Task gives `Missing in the code: <title>` with its references; a Drift gives its title, its references and its Where in the code. In Solo the source of a Drift marked `merge` is `This pull request`, of the others `Existing code`; in Collaborative the source of every row of the scan is `Scan`.
- The source of the rows of Trama's checks is `Trama`. The reference of a row is its first reference, or none.
- Rows are ordered by section, `Model`, `Model problems`, `Code`, `Open work`, and within a section by reference.
- A report is outdated when the head of the pull request read from GitHub differs from the head it was made on.

## github.PULL_REQUEST_GONE
- After every read of the pull requests that succeeds, Trama deletes the report of every pull request not in the list. A read that fails deletes nothing.

## developer.STOP_PULL_REQUEST_CHECK
- Available only on the pull request whose PR Check is running in this window, at any moment of the job, also while the agent waits for an answer.
