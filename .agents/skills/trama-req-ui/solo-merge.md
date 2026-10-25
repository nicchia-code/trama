# Requirements: Interfaccia, Solo merge

Use when building Merge in the side menu with Solo mode: the button, its lines, the branch list, the confirmations and the merge notices.

## solo-merge

- Side menu, in a project with Solo mode on only: at the bottom, after the line, the button `Merge` (icon `GitMerge`) comes first, then `Scan System` and `Settings`. `Merge` is the only button of the menu in the primary variant (`default`), as wide as the view, with icon and text aligned to the left; it has no tooltip, like everything in the menu (`ui#menu-laterale`). Its accessible name is `Merge`, followed by the line below it when there is one.
- When `Merge` is unavailable it is disabled, marked as disabled for assistive technologies, and a line below it in secondary text says why, the first that holds in this order:
  - `A merge is in progress.` (a merge, rebase or cherry-pick that Trama did not start);
  - `Check out a branch to merge.` (detached HEAD);
  - `Commit or stash your changes to merge.` (uncommitted changes, `rules#solo-merge`);
  - `Wait for the agent to finish.` (a job of the agent launched from this window is running).
- While some of Trama's files are tracked by git (`rules#solo-switch`), a line below `Merge`, after the reason if any, in warning colour: `Some Trama files are tracked by git: their changes enter your commits.`
- Pressing `Merge` shows the editor's progress notification `Fetching…` while git fetches, then a `QuickPick` titled `Merge into <current branch>` with the placeholder `Choose the branch to merge`: the upstream of the current branch first, with the description `upstream`, then the other remote branches, then the local ones, each group in alphabetical order, the current branch excluded. Escape closes it without merging.
- A branch that is neither the upstream nor `<remote>/<current branch>` asks first a modal confirmation of the editor, `Merge <branch> into <current branch>?`, with the detail `<branch> is not the upstream of <current branch>.` and the button `Merge`; cancelling merges nothing.
- Messages of the editor: a failed fetch, error `Trama: could not fetch: <reason>.`; already up to date, information `Trama: <current branch> is already up to date with <branch>.`; a merge refused or failed without conflicts, error `Trama: could not merge <branch>: <reason>.`; a merge without conflicts, information `Trama: merged <branch>. Scanning the System.`; a failed abort, error `Trama: could not abort the merge: <reason>.`. `<reason>` is git's first line of error, never its whole output.
- Merge with conflicts: the warning `Trama: merging <branch> left conflicts in <N> files.` (`1 file` in the singular) with the buttons `Open Merge Editor`, `Reconcile with Agent` and `Abort`; closing it chooses nothing.
- While a merge started by Trama is open, `Merge` is disabled and the line below it says `Merging <branch>: resolve the conflicts, then commit.`; below the line, ghost buttons as wide as the view, with icon and text aligned to the left: in the `Conflict` State `Open Merge Editor` (icon `GitCompare`) and `Reconcile with Agent` (icon `Bot`), and always `Abort Merge` (icon `X`). `Abort Merge` asks a modal confirmation of the editor, `Abort the merge of <branch>?`, with the detail `Every change of the merge is undone.` and the button `Abort Merge`.
- Icon-only mode (`ui#menu-laterale`): `Merge` and the buttons below it show only their icon; their lines are not shown, and their accessible names stay.
- The agent that reconciles opens a terminal, or a conversation of omp Chat, named `Merge`.
- The Drift card of a Drift from a merge has the badge `Merge` (`ui#drift`).
- All these texts are in English and do not follow `trama.language`.
