# Project

A folder that Trama is, or is not yet, set up in: whether it holds a Model, Requirements, Proposals, Tasks and Drifts, and the skills the agent needs.

## States

### Not a Trama project (initial)
The folder has no Trama files. Other actions point the developer to initialize it first.
- `developer.INITIALIZE_PROJECT` → Trama project: creates an empty Model whose description is a placeholder named after the folder, no Actors, the five starting Areas of Requirements (interface, technology, quality, data, business rules), places for Proposals, Tasks and Drifts, and installs the agent skills and the generated Requirement skills. Fails, creating nothing, if Trama files already exist in the folder. If an agent skill file already exists with different content, nothing is created until the developer confirms overwriting them; identical files are not a conflict.
- `developer.INITIALIZE_PROJECT` → Not a Trama project: the developer declines to overwrite customised skill files, cancels choosing among several workspace folders, or no folder is open.

### Trama project
The folder is set up. Its skills may fall behind the version of Trama or the Requirements.
- `developer.UPDATE_SKILLS` → Trama project: writes this version's agent skills, replacing older or edited copies, creates the five starting Areas if the project has no Requirements folder at all, and regenerates the Requirement skills; reports what changed.
- `workspace.REQUIREMENTS_CHANGED` → Trama project: after a short pause regenerates the Requirement skills, whether or not the Trama panel is open. If that fails the developer is told.
- `proposal.APPROVED` → Trama project: regenerates the Requirement skills, so the agent sees the Requirements the Proposal changed.
