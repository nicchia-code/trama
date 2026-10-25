# Manager mode

Whether this working copy uses Team (see the Team feature). Manager mode is recorded in the project, in a place that stays local to the working copy even when Trama's folder is tracked by git, so it never reaches the other clones and is never a user setting. The Settings tab shows it in its Project group with the note that it holds only for this working copy (see the Panel), and the setup wizard offers it in its Project step, in every mode (see the Setup wizard).

Manager mode needs the project's repository on GitHub: the remote the working copy calls origin points to a repository on GitHub. Without it, the Settings tab and the wizard show Manager mode off and not changeable, and say why. A Manager mode left on in a working copy whose origin no longer points to GitHub stays recorded, but Team is not available and the side menu has no Team entry until origin points to GitHub again.

Turning Manager mode off never deletes anything: the people stay in the Manager's editor and Team's work stays in the project, and turning it on again brings everything back.

## States

### Off (initial)
The working copy does not use Team: the side menu has no Team entry and the panel has no Team view.
- `developer.TURN_ON_MANAGER_MODE` → On: only when origin points to a repository on GitHub. Trama records Manager mode in the project; the side menu shows the Team entry. If the write fails, nothing changes and the reason is shown.
- `developer.INITIALIZE_PROJECT` → On: the developer chose Manager mode in the first setup of the wizard and confirmed. Trama records it as part of creating the project. If the write fails, the project is still created, Manager mode stays off and the reason is shown.
- `developer.CONFIRM_SETUP` → On: the developer chose Manager mode in the wizard opened from Guided setup or on an empty Model, and confirmed. Trama records it as above, together with the other choices of the wizard.

### On
The working copy uses Team.
- `developer.TURN_OFF_MANAGER_MODE` → Off: Trama forgets Manager mode; the side menu loses the Team entry. If the write fails, nothing changes and the reason is shown.
- `developer.CONFIRM_SETUP` → Off: the developer turned Manager mode off in the wizard and confirmed.

## Events

### TURNED_OFF
Emitted when Manager mode goes from On to Off, from the Settings tab or from the wizard.
