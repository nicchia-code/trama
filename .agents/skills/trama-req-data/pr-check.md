# Requirements: Dati, PR Check

Use when storing or reading the report of a PR Check, the list of pull requests read from GitHub or the worktree of a running PR Check.

## pull-request-report

- One file per pull request, `.trama/pr-checks/<number>.json`, in the open folder, never in the worktree. The folder `.trama/pr-checks/` holds a `.gitignore` containing `*`, like the other local folders of `.trama/`, so reports stay local even when `.trama/` is tracked and are never committed, with Solo mode on or off.
- Content: `{ "number": number, "title": string, "url": string, "variant": "solo" | "collaborative", "base": { "branch": string, "commit": string }, "head": { "branch": string, "commit": string }, "mergeBase": string, "checkedAt": string, "rows": Row[] }`, with full commit hashes and `checkedAt` as an ISO date and time. A `Row` is `{ "section": "model" | "model-problems" | "code" | "open-work", "ref": string | null, "finding": string, "source": string, "where": string | null }`; `ref` has the form of `refs` of the cards.
- The file is written to a temporary file and renamed, with LF line endings and a final newline, and read whatever its line endings. A file that is not valid counts as no report and is deleted at the next write of reports.

## pull-request-check

- The worktree of a PR Check is the folder `pr-check/<number>/` inside the editor's storage for the workspace (`ExtensionContext.storageUri`), outside the project; with no storage for the workspace the PR Check is not available.
- The running PR Check of a window lives only in the memory of that window: the number of the pull request, the folder of the worktree, the way it works, the merge-base, the launch instant, the terminal or conversation, and the rows of Trama's own checks computed at preparation.
- What Trama last read of the pull requests lives in `ExtensionContext.workspaceState`, key `trama.team.pullRequests`: `{ readAt, items, error }`, where an item is `{ number, title, author, baseRefName, headRefName, headRefOid, url }`. It is a cache: losing it only costs a read.
