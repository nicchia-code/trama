# Requirements: Dati, Team

Use when reading or writing the Manager mode file or the people of the Manager's team kept in the editor.

## manager-mode

- Manager mode lives in `.trama/manager/mode.json`, a JSON object `{}` with no fields. The folder `.trama/manager/` holds a `.gitignore` containing `*`, like the other local folders of `.trama/`, so the file stays local even when `.trama/` is tracked and is never committed, with Solo mode on or off.
- The file is present only while Manager mode is on; turning it off deletes the file and leaves the folder with its `.gitignore`. A file that is not valid JSON counts as Manager mode on; the next write replaces it.
- The file is written with LF line endings and a final newline, and read whatever its line endings.

## person

- The people live only in the editor's `ExtensionContext.globalState`, key `trama.team`, never in the project, in `.trama/`, in the settings or in any other file Trama writes. The key is not synchronised by Settings Sync: `setKeysForSync` is never called for it.
- Value: `{ "version": 1, "people": Person[] }`. A `Person` is `{ id, name, handle, level, skills, capacity, absences, repositories }`:
  - `id`: 8 lower-case letters and digits, created when the person is added, never changed.
  - `name`: the name as the Manager wrote it, without spaces around.
  - `handle`: the GitHub handle without `@`, as written; two people never share a handle compared without case.
  - `level`: `junior`, `mid` or `senior`.
  - `skills`: list of strings, in the Manager's order, no two equal without case.
  - `capacity`: days of work that fit in one sprint, a number.
  - `absences`: list of `{ from, to }`, dates `YYYY-MM-DD`, ordered by `from`.
  - `repositories`: the projects whose team the person is in, each as `<owner>/<repo>` of its GitHub repository in lower case, no duplicates.
- A person that does not match this shape, or whose values break `rules#person`, is kept in the value as it is, never shown and never offered; the other people are read normally. A value whose `version` is not 1 is not read and not overwritten: the Team view says the team cannot be read.
- A person whose `repositories` is empty stays in the value and is offered by `Add from other projects` of every project.
