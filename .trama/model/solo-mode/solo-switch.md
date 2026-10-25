# Solo switch

Whether this working copy uses Trama in Solo mode. Solo mode is recorded in the project, in a place that stays local to the working copy even when Trama's folder is tracked by git, so it never reaches the other clones. The Settings tab shows it in its Project group with the note that it holds only for this workspace (see the Panel), and the setup wizard offers it when the project is created (see the Setup wizard).

While Solo mode is on, Trama keeps its files out of git with a block of its own in the working copy's local exclusions of git, which are never committed; the developer's own lines there stay untouched. The developer chooses what the block covers: by default the whole folders where Trama writes (Trama's folder, the folder of the agent skills and omp's project folder), or only the files Trama writes there, for a team that keeps its own files in those folders. An exclusion cannot hide a file git already tracks: while some of Trama's files are tracked, the Settings tab lists them and says that their changes still enter commits.

Solo mode needs a git repository. In a folder that is not one, the Settings tab and the wizard show it off and not changeable, and say why.

## States

### Off (initial)
Trama's files are files of the project like the others, meant to be committed.
- `developer.TURN_ON_SOLO_MODE` → On: only in a git repository. Trama records Solo mode in the project, with whole folders as what is kept out of git, and writes its block in the local exclusions of git. Files of Trama already tracked do not stop it: Solo mode turns on and the Settings tab lists them. If a write fails, nothing changes and the reason is shown.
- `developer.INITIALIZE_PROJECT` → On: the developer chose Solo mode in the first setup of the wizard and confirmed. Trama turns it on as above, with what the developer chose to keep out of git, as part of creating the project and before writing any of its files, so they are never visible to git. If turning it on fails, the project is not created (see the Setup wizard).
- `developer.CONFIRM_SETUP` → On: the developer chose Solo mode in the wizard opened on an empty Model and confirmed. Trama turns it on as above, with what the developer chose to keep out of git, before going on with the chosen path.

### On
Trama's files stay out of git in this working copy.
- `developer.TURN_OFF_SOLO_MODE` → Off: Trama removes its block from the local exclusions of git, leaving every other line as it is, and forgets Solo mode. Trama's files become visible to git again, as untracked files ready to be committed. If a write fails, nothing changes and the reason is shown.
- `developer.CHANGE_SOLO_EXCLUSIONS` → On: the developer switches between whole folders and only Trama's files. Trama records the choice and rewrites its block with it; the list of Trama's files still tracked is updated. If a write fails, the choice stays the one before and the reason is shown.
- `developer.OPEN_PANEL` → On: every ordinary opening of Trama from the editor, as for the skills (see the Project). When Trama's block in the local exclusions of git is missing or differs from the one Solo mode needs, because it was changed or removed by hand or because the folder of the agent skills changed, Trama writes it again in silence. Nothing else changes.
- `developer.CONFIRM_SETUP` → On: the developer, in the wizard opened on an empty Model, kept Solo mode on but chose to keep out of git something else, and confirmed. Trama records the choice and rewrites its block, as above.
- `developer.CONFIRM_SETUP` → Off: the developer, in the wizard opened on an empty Model, turned Solo mode off and confirmed. Trama turns it off as above.
