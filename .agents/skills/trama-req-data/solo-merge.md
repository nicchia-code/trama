# Requirements: Dati, Solo merge

Use when reading or writing the remembered merge of Solo mode.

## solo-merge

- The merge Trama started and that is still open lives in `.trama/solo/merge.json`, in the local folder of Solo mode (`data#solo-switch`), never versioned: `{ "branch": string, "base": string, "incoming": string, "started": string }`, with the full commit hashes and the start as an ISO date and time.
- The file is written right before `git merge` runs and deleted when the merge ends in any way, also when it ends without conflicts. Only one merge is remembered; a file that is not valid JSON or misses a field is deleted at the next check, as a merge abandoned.
