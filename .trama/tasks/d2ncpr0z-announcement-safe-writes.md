---
column: done
technical: true
refs:
  - requirements/tech#announcement
  - requirements/data#announcement
drift: null
proposal: kv1x3wmx
agent: false
created: 2026-10-24T14:42:09.104Z
finished: 2026-10-24T14:54:31.026Z
---
# Safe announcement file writes

Several agents of the same terminal or conversation (the agent and its sub-agents) announce, note, change phase, bind Drafts and deliver at the same time, while the editor rewrites ghost titles. When this Task is done no change to an announcement is lost because another happened at the same moment, no window ever reads a half-written ghost, and no update brings back a ghost already delivered or withdrawn.

- Every write of an announcement file goes through a temporary file in the same folder that is then renamed (`src/core/atomic-write.ts`). The plain write in `write()` of `src/core/announcements.ts` (today `writeDocument` on the final file) and the in-place `r+` rewrite of `synchronizeAnnouncementTitles` in `extension/src/host/announcements.ts` are gone.
- Every read-modify-write of an existing announcement happens under the `announcements` lock of `src/core/file-lock.ts` (`withFileLock`, as Proposals and claims already use), and, inside the lock, only if the file still exists: `declareNote`, `bindDraft`, `changeCheckPhase`, the take-over of a scan check (or of a Unify Drifts Drift) in `announce`, `removeBoundTo`, delivery (`deliverCard`, the check's `delivered`/`failed`) and withdrawal, and the title synchronisation in the extension. Today `declareNote` checks `existsSync` and then writes outside any lock, so a ghost removed in between comes back.
- When the file no longer exists nothing is written and the command line exits with an error saying that the announcement no longer exists. The title synchronisation simply skips it and never recreates it; it still keeps identity, `kind`, `source`, `proposal`, `terminal` and `touched`, never touches a `drift` announcement bound to a Draft, a comparison or an announcement with `drifts`, and writes nothing when the title already matches.
- `trama announcement new` without `TRAMA_TERMINAL` stays refused with its error and writes nothing (already so in `src/cli/commands/announcement.ts`).
- `trama comparison new` without `TRAMA_TERMINAL` (`src/cli/commands/comparison.ts`, `src/core/compare.ts`) still gives the briefing but creates no announcement and no ghost with `terminal: null`: the comparison data (code fingerprint and texts) go to a separate file that the Snapshot does not read as an announcement and that the orphan withdrawal never touches; `trama comparison move <id> delivered` deletes it.
- The General conversation's `TRAMA_TERMINAL` has the same six lowercase letters and digits form as every terminal ID (`newTerminalId`), saved with its entry, instead of `randomUUID()` in `extension/src/host/omp-chat/general.ts`, so the command line recognises it and General's agent can announce.
- Data: an announcement has no `chat` or `conversation` field and no `job` (ignored when left from before); the dead "local channel" path of a finished check (`FinishedCheck`, `checkOutcome`/`forgetCheck` in `src/core/announcements.ts`) is replaced by a plain locked delivery that removes the file, so the CLI move of a check does not depend on it.
