---
status: approved
kind: import
requires:
  - 4986b5ff
  - 08b2fdb7
  - 2c22012e
base:
  project-setup/feature.md: new
  project-setup/project.md: new
  requirements/tech.md: f907dfe85cc0d458e4b36a8541b3d204109a03116527a8310292ada98befb946
  requirements/rules.md: 1c97bf9cf75c038493faa9e73013051741f40f17d5377438ea28e556010f5d48
delete: []
created: 1970-01-01T00:00:00.005Z
---
# Import: Project setup

Describes setting up Trama in a folder and keeping the agent skills in step (src/cli/commands.ts init and skills update, src/cli/skills.ts, src/core/requirement-skills.ts, src/core/requirements.ts, extension/src/host/project.ts, main.ts, mcp-config.ts).

## Doubts

- Looks like a bug: regenerating the Requirement skills removes every folder named `trama-req-*` in the skill folders that holds no Area with content (`src/core/requirement-skills.ts:52-53`, `rmSync(..., { recursive: true })`), including a folder the developer wrote by hand with that prefix. `trama-req-*` is documented as generated and never to be edited, so this is probably intended, but nothing protects handwritten ones.
- Behaviour not determined: the editor's Update Agent Skills command refreshes only the folder set by the `trama.skillsDir` setting (`extension/src/host/project.ts:57-59`), not the other folders where Trama's skills may be installed (`.claude/skills`, `.github/skills`). A project initialized with `.claude/skills` and the default setting gets a second copy in `.agents/skills`; the Requirement skills are regenerated in both. Whether that is intended was not determined.
- Not modelled: when a Trama project already exists, the Initialize command fails with "already exists" and only shows the message (`src/cli/commands.ts:init`, `extension/src/host/project.ts:36-52`); there is no transition because nothing changes.
