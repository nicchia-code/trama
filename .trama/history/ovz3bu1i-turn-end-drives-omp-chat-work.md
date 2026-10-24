---
created: 2026-10-24T15:41:22.111Z
updated: 2026-10-24T15:41:22.111Z
summary: In omp Chat the end of a job is omp's answer to the prompt over ACP; the hook, execution check and ghosts follow it, and the ACP connection is hardened.
tasks:
  - z4nrmma6
  - hrhnavfk
  - 106ej5cj
  - 43fzs0jh
  - j7hj288b
  - m810ahe4
  - ndm3a0cy
  - dmk24g32
  - f9g83b1x
  - kih1nwne
  - j6i063tt
  - 8n29o5fw
  - ymzqtz1l
---
# Turn end drives omp Chat work

omp's answer to a job's prompt (`omp-acp.TURN_ENDED`) now ends a Run, resolution, unification and refinement in omp Chat conversations through `endAgentWork`, releases Tasks, claims, ghosts and delivered cards, and the hook no longer reports start or idle there. The ACP connection reports every end, failure and stop with its reason, declines forms in job conversations, and opening a window withdraws only orphan announcements.
