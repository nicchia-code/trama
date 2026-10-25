---
description: "Use when computing what Solo mode keeps out of git, its exclusion block and when Trama rewrites it."
---
# Solo mode

## solo-switch
- Solo mode is on exactly when the project's Solo mode file exists (`data#solo-switch`). It is never read from the user or workspace settings of the editor.
- Solo mode needs a git repository: the project root is inside a git working tree (`git rev-parse --is-inside-work-tree` answers `true`). Otherwise turning it on is refused with the reason `Solo mode needs a git repository.` and nothing is written; turning it off still removes the file and, when the exclusion file exists, the block.
- The exclusion file is the one git uses for the working copy, `git rev-parse --git-path info/exclude`, so a linked worktree writes into the exclusions of its repository. Trama creates it, with its folder, when it is missing.
- The block is the lines from `# trama solo mode` to `# end trama solo mode`, both included. Writing the block replaces the first such block, or appends it at the end of the file, preceded by a newline when the file does not end with one; removing it removes those lines and nothing else. Lines outside the block, the line endings already in the file and a second block written by hand stay untouched. Writing the same block again leaves the file byte for byte unchanged.
- The block's patterns are anchored to the repository root: each path of the project gets the project's prefix inside the repository (`git rev-parse --show-prefix`), so a project in a subfolder excludes only its own files. `<skills>` is the folder of the agent skills of the project, from `trama.skillsDir` (default `.agents/skills`).
  - `Whole folders` (`folders`): `/<prefix>.trama/`, `/<prefix><skills>/`, `/<prefix>.omp/`.
  - `Only Trama's files` (`files`): `/<prefix>.trama/`, `/<prefix><skills>/trama-*/`, `/<prefix>.omp/agents/trama-analysis.md`, `/<prefix>.omp/agents/trama-implementer.md`, `/<prefix>.omp/WATCHDOG.yml`. The `trama-*` pattern covers also the generated `trama-req-*` skills.
- Tracked files: the files git tracks under the block's patterns (`git ls-files -z` on the same paths), relative to the project root, in git's order. They are computed after every write and every time the Settings tab is shown; they never stop Solo mode from turning on.
- Repair: at every ordinary opening of Trama (`rules#project`), in the same background check of the skills, with Solo mode on Trama computes the block for the current kind and `trama.skillsDir` and writes it when the file has no block or a different one. It does not tell the developer when it rewrites; a failed write is reported like a failed update of the skills, with the message of `ui#solo-switch`.
- In the setup wizard nothing is written before the confirmation. In the first setup the block and the Solo mode file are written before any other file of the project, by the same initialization; if that fails, the initialization fails and creates nothing. In empty-Model mode the change of Solo mode is written after the settings and before the path starts, only when it differs from the project's current value.
