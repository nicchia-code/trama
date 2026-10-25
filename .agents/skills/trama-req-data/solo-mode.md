# Requirements: Dati, Solo mode

Use when reading or writing the project's Solo mode file.

## solo-switch

- Solo mode lives in `.trama/solo/mode.json`, a JSON object `{ "exclusions": "folders" | "files" }`. The folder `.trama/solo/` holds a `.gitignore` containing `*`, like the other local folders of `.trama/`, so the file stays local even when `.trama/` is tracked.
- The file is present only while Solo mode is on; turning it off deletes the file and leaves the folder with its `.gitignore`.
- A file that is not valid JSON, or whose `exclusions` is neither `folders` nor `files`, counts as Solo mode on with `folders`; the next write replaces it.
- The file is written with LF line endings and a final newline, and read whatever its line endings.
