---
column: done
technical: false
refs:
  - announcement
  - announcement/Announced
  - announcement/Delivered
  - announcement/Withdrawn
  - requirements/data#announcement
  - requirements/rules#announcement
drift: null
proposal: "0020"
agent: false
---
# Keep announcements as temporary ignored files that follow the Announcement's States

The System can keep, read and end announcements of cards the agent is about to create.

- An announcement has a kind (Proposal, Task or Drift), a title, a source (the agent or a design request), the Draft bound to it once there is one, and when the agent last did something about it. It lives in its own temporary file, with an ID of six random letters and digits.
- The first announcement also creates the folder's own ignore file, so announcements are never versioned and nothing else in the project is ignored.
- It starts Preparing; it becomes Writing when a Draft is bound to it, and then it follows the Draft's title. It ends Delivered or Withdrawn, and an ended announcement ceases to exist at once.
- The picture of the project that the panel and the tools receive includes the announcements that still exist, and a change in them counts as a change of the project's files.
- The folder's presence does not make the Model, the Requirements or any other listing invalid.
