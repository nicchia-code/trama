# Pull request check

The PR Check of one pull request, as one window of the editor runs it: at most one at a time per window. Trama prepares a git worktree on the head of the pull request, in the editor's private folder for the workspace, has the agent scan the whole System there and, when the agent has finished, writes the report and removes the worktree (see the PR Check feature). While the PR Check is hidden it stays Idle: nothing offers Check.

The agent works in the worktree like any other job, in a terminal or in omp Chat (see the Agent terminal), with the role of the scan; Trama announces it as a work titled after the pull request, whose ghost stays in the editor's status bar. The cards the scan files stay in the worktree and never reach the Board of the open folder; the scan never counts as the last scan of the System of the open folder.

A worktree of the PR Check left behind by a window that closed or crashed while checking is removed when a window opens the project again; no report is written for it.

## States

### Idle (initial)
No PR Check of this window is running.
- `developer.CHECK_PULL_REQUEST` → Checking: only on a pull request the Pull Requests tab lists, while the GitHub command line can read the repository, and no Run launched from this window is in progress. Trama fetches the head of the pull request and the branch it goes into, creates the worktree on that head, prepares it for the way the PR Check works (Solo or Collaborative), writes there the agent skills of this version, then launches the agent with the scan of the whole System.
- `developer.CHECK_PULL_REQUEST` → Idle: the fetch, the worktree, its preparation or the launch fails, for example because omp is missing. An error says why, Trama removes what it created of the worktree, and the report of the pull request, if any, stays as it is.

### Checking
The agent is scanning the worktree. The Pull Requests tab shows the pull request as being checked, with Stop, and Check is unavailable on every pull request.
- `agent-hook.IDLE` → Idle: the agent of the PR Check said with its hook that it is idle. When the agent delivered its scan, Trama writes the report of the pull request, replacing the previous one; otherwise no report is written, the previous one stays and a notice says that the PR Check did not finish. In both cases Trama removes the worktree.
- `omp-acp.TURN_ENDED` → Idle: omp ended the turn of the conversation of the PR Check. Trama ends the PR Check as when the hook says idle.
- `terminal.COMMAND_ENDED` → Idle: the command Trama typed in the terminal of the PR Check ended. Trama ends the PR Check as when the hook says idle.
- `terminal.CLOSED` → Idle: the terminal of the PR Check was closed. Trama ends the PR Check as when the hook says idle.
- `time.CHECK_DUE` → Idle: the execution check finds that no open window follows the terminal or the conversation of the PR Check and that its agent process no longer exists. Trama ends the PR Check as when the hook says idle.
- `developer.STOP_PULL_REQUEST_CHECK` → Idle: Trama stops the agent, closing its terminal or its conversation, and removes the worktree. No report is written and the previous one stays; no notice.

## Events

### REPORTED
Emitted when a PR Check ends with its scan delivered and Trama has written the report of that pull request.
