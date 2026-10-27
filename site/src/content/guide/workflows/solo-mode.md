---
title: "Solo mode and Merge"
description: "Use Trama alone in a repository where the others do not, and merge their work back into the Model."
order: 11
---

**Solo mode** is for a developer who uses Trama in a repository where the rest of the team does not. With it on, Trama's files, the Model, the Requirements, the cards, the skills and what Trama installs for omp, stay in your working copy only. Trama keeps them out of git with an exclusion that lives in that copy and is never committed, so the shared repository sees only code.

```step
title: Turn Solo Mode on
text: |
  In the **Project** group of Settings, check **Solo Mode**; the note under it reads `Only this workspace.` The mode belongs to one working copy, not to you: another clone of the same repository starts with it off. The same checkbox is in the **Project** step of the setup wizard.
scene: solo-settings
alt: "The Project group of Settings with Solo Mode checked, the Exclude selector set to Whole folders, the Manager Mode checkbox, and the Merge button now present at the bottom of the side menu."
eager: true
```

Solo mode needs a git repository: outside one, the checkbox is disabled and says `Solo mode needs a git repository.` If some of Trama's files are already tracked by git, a warning lists them, because their changes are still committed. Because the files are versioned nowhere, losing the working copy loses them.

With Solo mode on, choose what to keep out of git in **Exclude**:

- **Whole folders** (the default): `.trama/`, the agent skills folder and `.omp/`.
- **Only Trama's files**: `.trama/`, the `trama-*` skills and the files Trama writes in `.omp/`, for folders the team also uses.

```step
title: Press Merge
text: |
  Others keep committing code that your Model knows nothing about. **Merge**, at the bottom of the side menu, brings their work into your branch and then has the agent compare the whole System with the code.
scene: solo-merge-menu
alt: "The Board with the blue Merge button at the bottom of the side menu, above Scan System and Settings, and the current branch main in the status bar at the bottom left."
```

```step
title: Choose the branch
text: |
  Trama fetches (`Fetching…`), then asks you to choose the branch: the upstream of the current branch first, then the other remote branches, then local ones. For a branch that is not the upstream, a confirmation asks `Merge <branch> into <current branch>?`
scene: solo-merge-branch
alt: "The quick pick Merge into main at the top of the window with the placeholder Choose the branch to merge and two branches listed, feature/gift-cards and feature/refunds."
```

Git merges. Without conflicts, `Trama: merged <branch>. Scanning the System.` and the scan starts by itself. With conflicts, a warning offers **Open Merge Editor**, **Reconcile with Agent** and **Abort**; while the merge is open, the menu shows the same actions, and **Abort Merge** asks for confirmation.

```step
title: Resolve what the Merge opened
text: |
  Every difference their work opened becomes a Drift on the Board, with the badge `Merge`. These Drifts lean towards keeping the code and adapting the Model, since the others do not keep the Model up to date (see [Resolve Drifts](/guide/workflows/drifts/)).
scene: scan-result
alt: "The Board after the scan that follows a Merge: a red Drift card in the Backlog with Resolve and Dismiss Drift buttons, the Scan conversation in omp Chat and the number 1 on the Board entry."
```

**Merge** is disabled, with the reason under it, when a merge is already in progress, when HEAD is detached (`Check out a branch to merge.`), when there are uncommitted changes (`Commit or stash your changes to merge.`) or while an agent works (`Wait for the agent to finish.`).
