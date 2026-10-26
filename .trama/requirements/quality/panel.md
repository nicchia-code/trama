---
description: "Use for the performance and reliability of the panel's views, of the picture of the project and of the side menu."
---
# Panel performance

## panel
- Performance: changing the panel's view (from the side menu, a palette command, a focus or an internal link) builds no picture, reads no file of `.trama/` and starts no process in the editor host. The view changes at once, whatever the size of the project and whatever antivirus inspects files and processes. The only exception is the read of GitHub that the Team view starts in the background when it appears (`rules#github-project`), which never holds the view back. The skills check runs only as `rules#project` says.
- Performance: one change of the files gives one picture, shared by the panel and the side menu. A picture reads and parses each file of `.trama/` at most once and, in the editor, only the files changed since the previous picture. Its time grows linearly with the number of cards, never with their product (for example unified Drifts by all Drifts).
- Reliability: the cache never shows an old file. A file whose modification time, size or identity changed is read again. A file that cannot be read is an error as today, and the panel keeps its last picture. A refresh asked by an action of the panel always sees what the action wrote.
- Acceptance exercises, on a project with some hundreds of Drifts (some unified), Proposals and History entries: switching among every view with the panel open, with no file read and no process started; a card file changed by hand that shows at the next picture; a deleted card that leaves the Board; Approve and Clear that show their result at once.

## menu-laterale
- Performance: when the panel changes view, and when the menu becomes visible again, the menu shows its last state at once, reading no file and starting no process; only the highlight of the view moves.
