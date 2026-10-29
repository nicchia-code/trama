# PR Check

Hidden for now: no surface of Trama offers the PR Check. The Team view has no Pull Requests tab and exists only with Manager mode on, Trama reads no pull request from GitHub and starts no PR Check, and the Events of the developer that start or stop one cannot happen. What follows describes the PR Check as it works when it is offered; its code stays in the project. The reports already written stay in the working copy as they are, neither read nor deleted, and a worktree left behind by an earlier PR Check is still removed when a window opens the project.

How a developer checks a pull request of someone else against the Model before it is merged, without touching the folder he works in. Anyone can do it, with or without Manager mode, in a project whose repository is on GitHub: the Pull Requests tab of the Team view lists the open pull requests that are ready for review, and Check on one of them starts the PR Check (see the Panel).

Trama takes the head of the pull request as it is, with no merge, into a git worktree of its own, kept in the editor's private folder for the workspace and never in the project: the open folder, its Board, its last scan and everything it keeps locally stay as they are. In that worktree the agent scans the whole System, like Scan System, and the cards it files stay there. When the agent has finished, Trama gathers what the scan found and what Trama itself checked into a report, then removes the worktree. The scan is always of the whole System: it costs, and that is wanted.

The PR Check works in one of two ways, which Trama chooses by itself:

- **Solo**: with Solo mode on, or when the pull request has no Trama folder. The others do not use Trama, so the only Model is the one of the open folder: Trama copies its own files of the open folder (the Model, the Requirements, the Specs, the cards and what Trama installs for the agent) into the worktree, and the scan marks as coming from the pull request every Drift whose code lies in a file the pull request changed since it left the branch it goes into.
- **Collaborative**: with Solo mode off and a Trama folder in the pull request. The others use Trama, so the pull request brings its own Model: Trama first compares Trama's folder at the point where the pull request left the branch it goes into with the one at its head, element by element, and checks that Model; then the agent scans the code against the Model of the pull request.

The report is informative: a table that never decides anything, never reaches GitHub and is never committed. It stays only in the working copy of whoever ran the PR Check, one per pull request, replaced by the next check of the same pull request and deleted when the pull request is no longer open and ready for review.

Trama runs git and the GitHub command line itself, only to read GitHub; it never reads the code: the agent does, in the scan.
