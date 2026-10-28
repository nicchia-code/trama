---
description: "Use when the PR Check touches privacy, security or reliability: what reaches GitHub, running code of others, and never leaving the open folder changed."
---
# PR Check

## pr-check
- Privacy: the PR Check writes nothing to GitHub; its `gh` calls only read the pull requests. The report never leaves the working copy and is never committed.
- Security: the code of a pull request, also from a fork, is untrusted. Trama never runs anything of the worktree; the instruction tells the agent not to run, build or install anything of the pull request. The number, the branch names and the commits read from GitHub reach git only as fixed arguments, never through a shell.
- Reliability: a PR Check never changes the open folder's files, index, HEAD or branches, and never creates refs: the only trace in the repository is the registration of its worktree, which Trama removes at the end, at Stop, on failure and, for a window closed while checking, at the next opening.
- Reliability: a PR Check that fails or stops never changes the previous report of its pull request.
- Performance: the read of the pull requests runs in the background like the reads of Team (`quality#panel`) and never holds the view back.
- Acceptance exercises: a PR Check in Solo and one in Collaborative on a sample repository with a fork's pull request; Stop while the agent works; a window closed while checking, then reopened; `git status`, `git branch` and `git worktree list` of the open folder unchanged after each.
