# Pull request report

What the last PR Check of one pull request found, kept only in the working copy of the developer who ran it, never committed and never sent anywhere. It is a table with one row per finding, which never decides anything: in Solo, the Tasks and Drifts of the scan, telling the Drifts in code the pull request changed from the others; in Collaborative, also the differences of the Model, the Requirements and the Specs brought by the pull request, the problems of its Model (not valid, changed without an approved Proposal, changed also on the branch it goes into) and the cards it leaves open. The Pull Requests tab of the Team view opens it in a window over the view (see the Panel).

## States

### Not checked (initial)
The working copy holds no report of this pull request.
- `pull-request-check.REPORTED` → Reported: only for this pull request. The Pull Requests tab shows when it was checked and offers the report.

### Reported
The working copy holds the report of the last PR Check of this pull request that finished. When the head of the pull request has moved since, the Pull Requests tab says the report is outdated; the report itself does not change.
- `pull-request-check.REPORTED` → Reported: only for this pull request. The new report replaces the previous one.
- `github.PULL_REQUEST_GONE` → Not checked: Trama deletes the report.
