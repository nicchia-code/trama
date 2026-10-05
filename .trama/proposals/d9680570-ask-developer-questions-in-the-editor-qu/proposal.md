---
status: approved
base:
  agent-questions/feature.md: new
  agent-questions/question-round.md: new
  actors/agent.md: 4184e1da755e50e0f721f5cb4ffea2865e056aed0d320b8054a66ddf02914273
  actors/developer.md: ff6fbeacdfc684d5038c9ef5b77962925ea175c67ac4047f998153b45d386d80
  requirements/ui.md: da22f90089ba2dd199537861d09298053ddbeddd40e4f22998b51065b04f0d48
  requirements/data.md: 8cc710f658e581be021630bdb851c586736aeaeef7f17076f1d762a939d9aa73
  requirements/rules.md: d76e04cd0d1d5c5a5173eebf7a87daca4c1b8711af88ebbf7c80667391e81ca9
  requirements/tech.md: 1ab4d2818f60117b019275ac4433bc911ee627cff0acd610404d3eb7b1ff885f
delete: []
created: 1970-01-01T00:00:00.012Z
---
# Ask developer questions in the editor Quick Pick

Replace agent-specific question interfaces in trama-design, trama-fix and trama-import with native VS Code/Cursor top-of-window choice menus. Support Copilot, Cursor and terminal agents through one question contract, retaining the agent question tool only when the editor is unavailable. The developer confirmed single/multiple choice, sequential rounds with Back, Other text, Escape confirmation (Skip this one, Skip all, Go back), recommended defaults, FIFO queueing and no Trama timeout. Skipped questions use the agent recommendation and must be listed as decisions to verify. Transport is a user-local socket (Windows named pipe), terminal environment address plus project discovery outside the repository; also expose blocking trama ask with JSON stdin. Confirmed details: refuse empty free text, use the launching window or most recently focused project window, English interface labels and client-specific titles. This is a design Proposal only; no implementation or live Model changes.
