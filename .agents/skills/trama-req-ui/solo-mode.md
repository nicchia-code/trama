# Requirements: Interfaccia, Solo mode

Use when building the Solo Mode row of the Settings tab and of the setup wizard's Project step.

## solo-switch

- Settings tab, in a project only: in the `Project` group, right after `trama.skillsDir`, the row `Solo Mode`, drawn with the same component and layout as the other settings (`ui#panel/Settings`): bold title, explanation in secondary text, a `Checkbox`, then only the messages present. Explanation: «Use Trama alone in a repository where the others do not: Trama's files stay in this working copy, kept out of git by `.git/info/exclude`. They are versioned nowhere else.»
- Under the control, always, the note `Only this workspace.` in secondary text, in the style of `The workspace setting overrides this: <valore>.`
- With Solo Mode on, below the note, the field `Exclude` as a `Select` with two values and, under it, the description of the chosen one, like an enum setting:
  - `Whole folders` (the default): «Keeps out of git `.trama/`, the agent skills folder and `.omp/`.»
  - `Only Trama's files`: «Keeps out of git `.trama/`, the `trama-*` skills and the files Trama writes in `.omp/`, for folders the team also uses.»
- With Solo Mode on and some of Trama's files still tracked by git, below the field, in warning colour and with text: `These Trama files are tracked by git, so their changes are still committed:` followed by one path per line in the monospace font, at most 10, then `and <N> more`. Nothing is shown when none is tracked.
- Outside a git repository the `Checkbox` is disabled and off, and the row shows `Solo mode needs a git repository.` in secondary text, under the note.
- While a change is being written the `Checkbox` and the `Select` are disabled. A failed write shows the editor error `Trama: could not save Solo Mode: <reason>.` and the controls go back to the project's real value.
- Setup wizard, in the first setup and empty-Model modes only (`ui#setup-wizard`): the `Project` step shows the same row, note, `Exclude` field and git-repository message right after `trama.skillsDir`; the list of tracked files is not shown. In the `Summary`, the `Project` step adds the line `Solo Mode` with `On` or `Off` and, when on, the line `Exclude` with the chosen value, highlighted with the value it replaces when it changes the project's current value, like the other settings.
- The `Checkbox` has the accessible name `Solo Mode`, the `Select` `Exclude`; explanation, note and messages are linked with `aria-describedby`. Everything is reachable and changeable from the keyboard.
- All these texts are in English and do not follow `trama.language`.
