# Requirements: Tecnologia e vincoli, Task progress technology

Use when working on how the agent declares the percentage of a Task and how it is read.

## task/Taken by the agent

- `trama task move <id> doing` accepts `{ progress }`. With `progress` the command only declares (`rules#task/Taken by the agent`): it never calls the move, writes no `task-start` timing and does not touch the Task file. The value is checked by the zod schema of the input; `progress` with `todo` or `done`, or together with `unchanged`, is a usage error (exit 2). The output says the declared percentage, or the note of an ignored declaration.
- Declaring, reading and deleting the percentage are computed in `src/core`, next to `moveTask`. `moveTask`, `releaseTaken` (and `releaseTasks`), the take-back and `fixCode` delete the Task's file in the same step that changes the Task; a missing file is not an error.
- The Task summaries of the command line get `progress: number | null`, read in `src/core`. `TaskView` in the Snapshot has no `progress`, and the Board's card model has none: the webview's card neither receives nor draws it. The `Progress` component and `@radix-ui/react-progress` stay for the setup wizard, their other user.
- The distributed skill `trama-implement` tells whoever implements a Task, the main agent or the sub-agent of that Task, to declare its percentage with `trama task move <id> doing` and `{ progress }` at natural milestones of its own judgement, for example after reading the Task, when the code is written and when its tests pass, without fixed values and without having to declare before Done. A sub-agent declares only for its own Task. An ignored declaration never stops the work.
- `docs/cli.md` describes the option.
