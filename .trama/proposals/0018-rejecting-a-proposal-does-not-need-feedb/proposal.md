---
status: approved
base:
  model-changes/proposal.md: 495ce3b081e0a37e979dffcd0342c4291c38340077097da2ec1f0d83a634fb54
  requirements/rules.md: 017d2e251d0506bba1fb42da1af291d80b6e63d461aa03700275b1e47814cf7b
  requirements/data.md: 5bef2f1147c4637be53c5ca6db44f39ac06503e45864682f9b5d9e3ba2a7b26b
  actors/developer.md: 328997497a5c09561ce847ad324ef2efec5c3477449419653ebd440e67046c96
delete: []
---
# Rejecting a Proposal does not need feedback text

Resolves Drift 0003 in favour of the code: the editor, the CLI and the shared operation all let a Proposal be rejected without text, and the developer says feedback is not needed. The Requirement 'Rejecting needs feedback text' is removed and feedback becomes optional. Decisions to check: an empty or blank feedback appends no Feedback section; the editor's refusal of blank feedback and the CLI's required --feedback no longer match the Requirements and will be found by the next scan; the agent still reads the reason under Feedback when there is one.
