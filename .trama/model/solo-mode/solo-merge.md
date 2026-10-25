# Solo merge

The Merge of the side menu, which exists only while Solo mode is on (see Solo switch): Trama brings a branch chosen by the developer into the current branch with git, and after the merge has the agent scan the whole System, so that every difference the merged work opened against the Model becomes a Drift. Trama runs git itself; it never reads the code: the agent does, in the scan.

Merge is available only when nothing could be lost or mixed up: the working copy has no uncommitted changes to tracked files, Trama's own files apart; no merge, rebase or cherry-pick is in progress; the working copy is on a branch; and no job of the agent launched from this window is running. Otherwise the button is unavailable and says why. While some of Trama's files are still tracked by git, the button stays available and the menu reminds the developer that their changes enter the commits.

Trama remembers, in the working copy, a merge it started and that is not finished yet, so that a window closed or reloaded meanwhile finds it again: on reopening, if the merge commit has arrived the scan starts, if the merge is still open Trama keeps waiting, and if it was abandoned Trama forgets it.

The scan after a merge is the scan of the whole System, like Scan System, with no confirmation, and it counts as the last scan of the System for the number of Tasks finished since then (see the Menu laterale). It also tells the agent which files the merge brought in: a Drift whose difference lies in those files is a Drift from a merge (see the Drift).

## States

### Idle (initial)
No merge started by Trama is open.
- `developer.START_MERGE` → Choosing branch: only while Merge is available. Trama fetches from the remotes of the repository, then the editor shows the branches the developer can merge, remote and local, except the current one, with the upstream of the current branch first.
- `developer.START_MERGE` → Idle: the fetch fails. An error says why and nothing is merged.

### Choosing branch
The editor shows the list of branches.
- `developer.CANCEL_MERGE` → Idle: the developer closes the list without choosing. Nothing changes.
- `developer.CHOOSE_MERGE_BRANCH` → Idle: the chosen branch is neither the upstream of the current branch nor the remote branch with its name, and the developer declines the confirmation that asks whether to merge it anyway. Nothing changes.
- `developer.CHOOSE_MERGE_BRANCH` → Idle: the current branch already contains the chosen one. A notice says it is already up to date; no scan starts.
- `developer.CHOOSE_MERGE_BRANCH` → Idle: git merges without conflicts, with a merge commit or by moving the current branch forward. Trama starts the scan after the merge, with the files the merge brought in.
- `developer.CHOOSE_MERGE_BRANCH` → Merge open: git stops with conflicts. Trama remembers the merge, and a notice says that the merge left conflicts and offers the three ways to go on: the editor's merge editor, the agent, or abort.
- `developer.CHOOSE_MERGE_BRANCH` → Idle: git refuses or fails for another reason, for example because the merge would overwrite untracked files. An error gives git's reason; nothing is merged.

### Merge open
A merge started by Trama is in progress in git. The side menu says so under Merge, which is unavailable, and offers the choices of the current sub-State and Abort Merge. Trama never makes the merge commit: the developer does, from wherever he likes.
- `workspace.MERGE_COMMITTED` → Idle: the merge commit of that merge has arrived. Trama forgets the merge and starts the scan after the merge, with the files the merge brought in.
- `workspace.MERGE_ABANDONED` → Idle: the merge ended without a commit, aborted outside Trama. Trama forgets it; no scan starts.
- `developer.ABORT_MERGE` → Idle: Trama aborts the merge with git, bringing the working copy back to where it was before it; Trama forgets it and no scan starts. If git cannot abort, an error says why and the merge stays open.

#### Conflict (initial)
The conflicts are still there and nobody is resolving them through Trama.
- `developer.OPEN_MERGE_EDITOR` → Resolving: Trama opens the first file with conflicts in the editor's merge editor; the developer resolves the conflicts by hand.
- `developer.RECONCILE_MERGE_WITH_AGENT` → Resolving: Trama launches the agent, in a terminal or in omp Chat like any other job (see the Agent terminal), to resolve the conflicts in the open folder. The agent keeps the intent of both sides, asks the developer with a round of questions when it cannot tell which one holds, leaves the resolved files ready to be committed, and never commits nor aborts; it ends by telling the developer to review them and commit.

#### Resolving
The developer or the agent is resolving the conflicts; Trama waits for the merge commit.
