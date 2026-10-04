---
column: done
technical: true
refs:
  - requirements/rules#project
drift: "0006"
proposal: null
agent: false
---
# Fix code to match the Requirements: Requirement skills are not refreshed in the configured skills folder when a Proposal is approved

## What happens

approveProposal (src/core/proposals.ts:308) calls syncRequirementSkills(p) without the configured folder, so a configured trama.skillsDir outside the three usual ones is only refreshed by the extension's file watcher (extension/src/host/main.ts:76), not when 'trama proposal approve' or 'trama drift resolve --accept-proposal' runs from the command line or while the editor is closed. Init and 'skills update' (src/cli/commands.ts:130,145) do pass the folder.

## What should happen

requirements/rules#project says the generated trama-req-<area> skills are written into every skill folder that holds trama-design among .agents/skills, .claude/skills, .github/skills and the configured folder, and project/Trama project reacts to proposal.APPROVED by regenerating them.
