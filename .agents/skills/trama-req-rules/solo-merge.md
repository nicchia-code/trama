# Requirements: Regole di business, Solo merge

Use when computing when Merge is available, what it merges, when the merge is over and what the scan after a merge receives.

## solo-merge

- Merge exists only with Solo mode on (`rules#solo-switch`). It is available when all hold, checked when the side menu is shown, at every change of the files of the working copy or of git's state and right before the merge starts:
  - no merge, rebase, cherry-pick or revert is in progress (`MERGE_HEAD`, `REBASE_HEAD`, `CHERRY_PICK_HEAD`, `REVERT_HEAD` or the folders of a rebase in the git directory);
  - HEAD is on a branch;
  - no tracked file has changes, staged or not, outside the paths of the Solo mode block; untracked files do not count;
  - no job of the agent launched from this window is running (`rules#agent-terminal`).
- Files of Trama tracked by git do not make Merge unavailable.
- Fetch: `git fetch --all --prune`. A failure stops Merge before the list.
- Branches offered: the remote-tracking branches, except the symbolic `<remote>/HEAD`, and the local branches, except the current one. The upstream is the one of `@{upstream}` of the current branch; without one, no branch is marked and every branch other than `<remote>/<current branch>` asks the confirmation.
- Already up to date: the chosen branch's commit is an ancestor of HEAD; nothing runs and no scan starts.
- The merge is `git merge --no-edit <branch>`. A fast-forward counts as a merge without conflicts. Before running it Trama records the commit of HEAD (`base`) and of the branch (`incoming`).
- An open merge started by Trama is remembered in the working copy (`data#solo-merge`) from the start of `git merge` until it ends. It is over when `MERGE_HEAD` no longer exists: committed when HEAD contains `incoming` (`git merge-base --is-ancestor <incoming> HEAD`), abandoned otherwise. Trama checks it at every change of git's state, when the window opens and at every execution check (`time.CHECK_DUE`). A remembered merge whose `MERGE_HEAD` is there but points at another commit counts as abandoned.
- Abort: `git merge --abort`; then Trama forgets the merge.
- The scan after a merge starts at once, with no confirmation and with the other conditions of every launch, when the merge ends without conflicts or is committed. It is the scan of the whole System: the instruction names `base` and `incoming`, and the agent reads with `git diff --name-only <base>...<incoming>` the files the merge brought in. It writes `.trama/last-scan/system` like `Scan System`, at delivery (`data#task`). A scan that cannot start (omp missing, for example) is reported like any launch, and Trama does not retry it.
- Drift from a merge: the scan after a merge, its sub-agents included, marks `merge` every Drift whose `Where in the code` lies in one of those files; the agent decides, Trama does not check it. Only that scan marks Drifts.
- The agent that reconciles works in the open folder, on the merge in progress: it never commits, never runs `git merge --abort`, `git reset` or `git checkout` of whole branches, never touches `.trama/`, stages with `git add` only the files it resolved, and asks with `trama question new` when it cannot tell which side's intent holds.
