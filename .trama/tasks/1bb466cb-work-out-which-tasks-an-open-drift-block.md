---
column: done
technical: false
refs:
  - drift/Open
  - task
  - requirements/rules#task
drift: null
proposal: 94f35a4f
agent: false
created: 1970-01-01T00:00:00.036Z
---
# Work out which Tasks an open Drift blocks

A Task is blocked when an open Drift blocks it, or when it is the origin of a Drift fixed in the code and the Task created for that fix is not Done. An open Drift blocks its origin Task and every Task that is not Done and concerns the same thing: a reference equal to, or inside, one of the Drift's references (a Machine or Feature contains its States and Transitions), where a Requirement section of an element also counts as that element and the element as that section, and the General section of an Area is equal only to itself. A Technical Task is judged by its Requirement references. A Done Task is never blocked; a resolved Drift blocks nothing. The answer is derived each time from Drifts, Tasks and references, never stored on the Task, and tells for each blocked Task which Drifts, or which fix Task, are the reason.
