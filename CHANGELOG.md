# Changelog

## 0.0.2

- Windows (win32-x64) is packaged, tested and smoke-tested by the release workflow.
- On Windows, Copilot's hook file carries the PowerShell form `& "<trama.exe>" copilot-hook` in `windows` next to `command`, and Cursor's `hooks.json` uses `& "<trama.exe>" cursor-hook`. Update skills replaces Trama's entries in either form instead of adding new ones. The Cursor form has not been tried on Cursor.
- `trama validate` refuses Windows device names (`con`, `prn`, `aux`, `nul`, `com1` to `com9`, `lpt1` to `lpt9`) as Feature, Machine and Actor IDs and as Area and fragment names on every platform, so a project opens on Windows too. Names that only contain one of them stay valid.
- Proposal hashes and comparisons read the Model and Requirement files with LF line endings: a CRLF checkout (`core.autocrlf`) no longer makes a Proposal stale, and its shown changes, touched files and scan scope match a Linux checkout.

## 0.0.1

- First public release, under the GNU AGPL v3 (`AGPL-3.0-only`); the `.vsix` now ships the license text. Earlier tags and releases are gone, and versions restart from 0.0.1.
- The automatic Run no longer carries a fixed list of Task identities from its launch: before each group it reads the authorized Tasks from `trama drift autopilot --json`, so an origin Task whose fix Tasks became Done during the Run is picked up, and nothing outside the authorization is started.
- When the Drift autopilot leaves `disabled`, the window that coordinates the project imports the jobs the other editor windows still run, before it judges the barrier: a Run, scan or Resolve Drifts started in another window during `disabled` is no longer unknown to the coordinator that already held the role.
- With the Drift autopilot `disabled`, a window no longer shares its jobs or send reservations with the other editor windows of the project: another window's Run, scan or Resolve Drifts no longer makes Resolve Drifts or the Run buttons unavailable here, and a send no longer waits behind another window's send. Sharing starts when the autopilot is enabled.
- The Scan button's count restarts when the System scan's instruction is delivered (written to the terminal, sent to the chat, left ready in the chat or copied to the clipboard), not when its check finishes: a scan that fails, is interrupted or has its check withdrawn no longer leaves the count up, and the editor no longer tracks scan launches in memory.
- An agent terminal that went idle or whose command ended is no longer followed: a later idle signal, command end or close of that terminal no longer releases the Tasks the resumed agent took or withdraws its announcements.
- An agent terminal's instruction stays one line: the job ID is no longer written into it. The commands that take `--job` (`announce check`, `proposal new --automatic --resolution`, `drift autopilot`, `agent-event failed`) read the terminal's job from `TRAMA_JOB` when `--job` is absent; a chat job still gets its ID in the text.
- A Drift whose question was skipped in one editor window stays out of automatic resolution in every window: the skip, the later answer and a developer scan are forwarded to the project coordinator.
- An automatic resolution whose approval is refused now fails only the Drifts the refusal names (or whose decision no longer applies); the other Drifts stay open in the Proposal for the developer.
- Rejecting or discarding an automatic resolution no longer marks its undecided Drifts as failed; they stay open, unmarked, for the developer's own decision.
- Add coordinated Drift autopilot modes (`disabled`, `enabled`, `yolo`) with cross-window scan/Run barriers, host-only approval, job-scoped authorization and implementation Runs.
- Resolve Drifts pressed in a window that does not coordinate the project now asks the coordinator, over the local channel, to resume automatic resolution; until a coordinator resumes, that window says why the automatic part waits.
- Autopilot leaves out of automatic resolution a Drift whose Model elements no longer exist, so it stays for the developer instead of failing in the resolution agent.
- Resolve Drifts no longer clears failed automatic cases: a Drift whose automatic fix failed or was excluded gets manual questions on a click, even with full delegation.
- A refused automatic start (mode, barrier or Drift changed at the last moment) releases its reservation and records no failure; its Drifts or Tasks stay eligible for the next cycle.
- Track critical Drifts and failed check outcomes; expose automatic resolution status and critical markers in the CLI and Board.
- Autopilot: a failed or interrupted scan no longer suspends the delegation; it counts as finished.
- Autopilot status reports the last failed or interrupted scan as information; it changes no phase.
- A finished check's outcome reaches the editor over the local channel instead of a marker file, so the System scan memory and the autopilot no longer race for it.
- Add `trama.submitWhileRunning` (`disabled` by default): while a Trama run is in progress, the Run buttons are disabled and launches are refused with "A run is in progress"; `enabled` allows Runs during a run.
- Make the Board's Done column collapsible; it starts collapsed each time the panel opens.
