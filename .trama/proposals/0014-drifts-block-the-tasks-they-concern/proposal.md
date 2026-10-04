---
status: approved
base:
  work/drift.md: 2a7852a2aa060a26cbd16f5e2c4b7b676dc97361b6b8c259727d7af382f41fcc
  work/task.md: e32f9199ce072c790bbe5383669beca633599f2aef411170ccd3210204483d1e
  requirements/data.md: 7281265baa77d00f08032a792ed7145a10b503ff1efd26f3c12aafbe9b65e263
  requirements/rules.md: 1783fc7eddd7c5f71f63206efc72384b372530efd0817d9f6a5d6bba85ffb6d9
  requirements/ui.md: 46382539961d1b9c307b01507154245de81d21400ea42e96ffa521658b19ac93
  requirements/tech.md: 7f3482eff36fd39fe003ab34b562b99f350b1c5d9764eda3fa1de85e3711027d
delete: []
---
# Drifts block the Tasks they concern

Today an open Drift is tied to no Task: the only effect is the rule that a run stops at the first Drift it files, even for unrelated Tasks. Decisions confirmed with the developer: a Drift filed while implementing blocks its originating Task and every non-Done Task whose references overlap; a Drift filed by a Scan or a Fix blocks only overlapping non-Done Tasks; overlap is same element or one inside the other, plus Requirements applied to an element (a General section counts only for Tasks citing it); a blocked Task cannot be started by the agent and runs skip it and go on; the developer can still move it by hand. Resolving as fix-code returns the originating Task to To do, blocked until the fix Task is Done; the other resolutions free it. Visibility: badge with link on the Task, and the reason in the agent's refusal. Choices to check: blocking is derived from references, never stored on the Task; a Task already In progress by overlap only shows the badge; a Done Task is never blocked; no 'blocks N Tasks' on the Drift card; the run report lists skipped Tasks as agent behaviour, not as a Requirement.
