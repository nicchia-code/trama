---
status: resolved
resolution: fix-code
refs:
  - requirements/rules#project
proposal: null
task: e117a3f9
origin: 716e6dde
option: null
note: null
created: 1970-01-01T00:00:00.007Z
---
# Requirement skills refresh on approval needs the configured skills folder, which the command line cannot know

## What happens

approveProposal (src/core/proposals.ts:345) calls syncRequirementSkills(p) with no extra folder, and resolveDrift (src/core/work.ts:248) and 'trama proposal approve' (src/cli/commands.ts:221) go through it. The configured folder exists only as the editor setting trama.skillsDir (read in extension/src/host/main.ts:76 and extension/src/host/project.ts:35,58) or as the --skills-dir option of 'trama init' and 'trama skills update', which is not stored anywhere. I did not change the code: any fix has to invent where the command line learns the folder.

## What should happen

requirements/rules#project says the trama-req-<area> skills are written into every folder holding trama-design among .agents/skills, .claude/skills, .github/skills and the configured folder, and the Model regenerates them on proposal.APPROVED. Neither the Requirements nor requirements/data say how 'trama proposal approve' or 'trama drift resolve --accept-proposal' learn the configured folder when the editor is closed. The options are a --skills-dir option on those commands (the developer has to repeat it each time), the folder stored in a file under .trama/ (a new kind of persistent project information the Data Requirements do not list), or the editor passing it only to its own approvals. The Requirements should decide this.
