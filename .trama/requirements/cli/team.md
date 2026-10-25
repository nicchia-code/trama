---
description: "Use when adding, changing or using the `trama team` command or the Manager mode fields of `trama project`."
---
# Team commands

## team
- `trama team show` prints the members of the current project's team, ordered by name: for each, name, `@handle`, level, skills, capacity per sprint in days and the absences that end today or later, as Markdown; with `--json` a list of `{ name, handle, level, skills, capacity, absences: { from, to }[] }`. It has no input and never writes.
- The people live in the Manager's editor (`data#person`), so `trama team show` asks for them to the editor window that launched the agent, through the same endpoint and secret as `trama question new` (`TRAMA_QUESTION_ENDPOINT` and a recognised `TRAMA_TERMINAL`). Without them it fails with `trama team show needs the editor: only an agent started by Trama can read the team.` and exit code 1; with an editor that does not answer within 10 seconds, `The editor did not answer: open the project in the editor with Trama.` and exit code 1.
- With Team not available (`rules#manager-mode`) it fails with `Manager Mode is off in this working copy.` or `Manager Mode needs a repository on GitHub (the origin remote).`, exit code 1. An empty team prints `No one in this project's team.` (`--json`: `[]`) with exit code 0.
- `trama project show` prints the line `Manager mode: on (<owner>/<repo>)`, `Manager mode: on, but origin is not on GitHub` or `Manager mode: off`; with `--json` the fields `manager` (`true` or `false`, as recorded) and `managerRepository` (`<owner>/<repo>` or `null`).
- `trama project new` and `trama project edit` accept `manager?: boolean`. `true` writes the Manager mode file, refused without origin on GitHub with the reason of `rules#manager-mode`; `false` deletes it. `project edit` with only `manager` writes only Manager mode and does not reinstall the skills. In `project new`, Manager mode is written after the project's files, and a failure to write it is reported without undoing the project.
- `trama team show` is not a developer-only command: it is how the agent reads the team.
