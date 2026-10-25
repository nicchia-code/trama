# GitHub

The project's repository and its linked GitHub Project, as Trama sees them when it reads them through the GitHub command line (see the GitHub project). The people of the team work there; Trama only reads. Every Event is what a read finds changed since the read before, for an issue Trama published: an Event is not seen at the moment it happens on GitHub, but at the next read.

## Events

### WORK_STARTED
The issue's status in the Project says the work is in progress, or a branch or a draft pull request is linked to it.

### WORK_STOPPED
Nothing says any more that the work is in progress: the status went back, the linked branch and pull requests are gone.

### REVIEW_REQUESTED
A pull request that closes the issue is open and ready for review.

### REVIEW_DROPPED
The pull request that closes the issue was closed without merging or went back to draft, while the work is still in progress.

### ISSUE_CLOSED
The issue was closed as completed.

### ISSUE_NOT_PLANNED
The issue was closed as not planned.

### ISSUE_REOPENED
A closed issue was reopened.
