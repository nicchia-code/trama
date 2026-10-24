---
refs:
  - agent-launching
  - requirements/ui#agent-launching
---
# Minimum omp version

Trama requires omp 18.12.6 or later, the version its ACP connection is written for, and keeps no special path for older versions.

When this Task is done:

- The minimum version is one constant in `src/core`, with its tests. Before every launch of omp (every job, in the terminal or in omp Chat, and Ask more), and when General starts omp, the host reads the installed version with `omp --version` (`execFile`, no shell, fixed arguments, 15 s timeout) together with the existing update check, and the result is valid for one hour for every window, like the update check.
- An omp older than the minimum, or whose version cannot be read, counts as a missing omp that can be updated: the launch waits for the update as for a new version, with the existing notification. When the update cannot be done the job does not start and an editor notice says `Trama needs omp <minimum> or later; the installed omp is <version>.` with the buttons `Install omp` (which installs the current omp) and `Open Settings`, like the notice of a missing omp. General shows the same sentence as its error line, with `Install omp`, and no editor notice. The `omp` step of the setup wizard and the omp row of the Settings tab show the same sentence in place of the version when omp is older than the minimum.
- An omp at or above the minimum behaves exactly as today: a failed update check or update never stops a job when omp is present and recent enough.
- The texts are in English and do not follow `trama.language`.
