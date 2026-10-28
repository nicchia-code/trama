# Requirements: Interfaccia, Team view

Use when building or changing the Team view of the panel, its tabs, the People tab, the person dialog and the Manager Mode rows of Settings and the wizard.

## panel/Team

- The view has, at the top, the title `Team` with the same size and weight as the titles of the other views, followed on the same line, with Manager mode on, by the GitHub Project button and, at the right, `Updated …` and `Refresh` (`ui#github-project`); under it the bar of its tabs: a shadcn/ui `Tabs` list in the segmented style (muted background, the chosen tab on the card background with `shadow-sm`). With Manager mode on the tabs are, in this order, `Decisions`, `Issues`, `Pull Requests`, `Timeline` and `People`; with Manager mode off the bar holds only `Pull Requests` (`ui#pull-request-check`). Under the bar, a line in the border colour separates the header from the content of the chosen tab. Narrower than 480 px the Project button goes under the title.
- The view opens on its first tab; the chosen tab stays while the view updates and while the developer visits other views, and is forgotten when the panel closes. When Manager mode goes off while another tab is chosen, the view passes to `Pull Requests`.
- Every text of the view is in English and does not follow `trama.language`.
- Everything is reachable from the keyboard with a visible focus ring; the tab list follows the `Tabs` keyboard pattern (arrows move between tabs). Every icon-only button has a tooltip and an accessible name equal to the tooltip. State is never told by colour alone.

## person

- People tab, header row: on the left, in secondary text, `<n> people in this project's team` (`1 person in this project's team`, singular); on the right `Add from other projects` (`Button` `outline`, lucide `Users`) and `Add person` (primary `Button`, lucide `UserPlus`). `Add from other projects` is disabled, with the reason as its tooltip `Everyone you know is already in this team`, when no person outside this team exists.
- People tab, table inside a bordered card (`rounded-lg`, border colour of the theme): columns `Person`, `Level`, `Skills`, `Capacity`, `Next absence`, `Actions`, with header cells in secondary text. One row per person, ordered by name (case-insensitive), with:
  - `Person`: a round avatar of 32 px with the initials (first letter of the first two words of the name, upper case) on the muted background, the name in medium weight and under it `@<handle>` in the monospace font and secondary text. Trama never loads the GitHub avatar.
  - `Level`: an outlined `Badge` with `Junior`, `Mid` or `Senior`.
  - `Skills`: one secondary `Badge` per skill, in their order, wrapping inside the cell.
  - `Capacity`: `<days> d / sprint` (`4.5 d / sprint`).
  - `Next absence`: lucide `Calendar` then `Off <day>–<day> <month>` (`Off 10–12 Nov`), `Off <day> <month>` for one day, `Off <day> <month> – <day> <month>` across months, with the year only when it is not the current one; `None planned` in secondary text when there is none.
  - `Actions`: two icon-only `ghost` buttons, lucide `Pencil` with tooltip `Edit <name>` and lucide `UserMinus` with tooltip `Remove <name> from team`.
- Narrower than 640 px the table becomes a list: each person is a block with avatar, name and handle on the first line and the actions at its right; level, capacity and next absence on the second line separated by ` · `; skills on the third line.
- Empty team: in the content area, centred, a round muted icon box with lucide `Users`, the heading `No one in this team yet`, the text `Add the first person so the agent can propose assignees, reviewers and sprints that fit their capacity.` in secondary text, and the buttons `Add the first person` (primary, `UserPlus`) and `Add from other projects` (`outline`, `Users`, with the same disabling as above).
- `Remove from team` takes the person out at once, without confirmation; a notice at the top of the tab says `<name> left this team.` with `Undo`, which adds them back, until the next change or 10 seconds.
- Person dialog: a shadcn/ui `Dialog`, about 480 px wide, titled `Add person` or `Edit person`, with the description `Trama uses this to propose assignees, reviewers and sprint load.` Fields, in this order, each with its label above:
  - `Name`: text input.
  - `GitHub handle`: text input with a fixed `@` prefix inside the field's border, monospace text.
  - `Level` and `Capacity per sprint` on one row: a `Select` with `Junior`, `Mid`, `Senior` (default `Mid`), and a number input with step 0.5 (default 5) followed by `days` in secondary text.
  - `Skills`: a tag input; each skill is a secondary chip with an `X` button (accessible name `Remove <skill>`), and the input at the end has the placeholder `Add a skill…`; Enter or a comma adds what is written, Backspace in an empty input removes the last chip.
  - `Absences`: one row per absence with two date fields (lucide `Calendar`, `From` and `To` as accessible names) separated by `–` and an icon-only `Trash2` button (`Remove absence`); under them `Add absence` (`ghost`, lucide `Plus`). Absences are shown in date order.
- The dialog's footer has, at the left, `Delete person` (`outline` in the destructive colour, lucide `Trash2`, only when editing) and, at the right, `Cancel` (`outline`) and `Save` (primary). `Save` checks every field; an invalid field gets the destructive border, `aria-invalid` and, under it, lucide `CircleAlert` with the message of `rules#person` in the destructive colour, linked with `aria-describedby`; the focus goes to the first invalid field and nothing is saved. Esc, the `X` of the dialog and `Cancel` close it without saving.
- `Delete person` opens a modal dialog of the editor: `Delete <name>?`, detail `They leave every project's team. Issues already assigned to them on GitHub stay assigned.`, button `Delete`. `Cancel` does nothing.
- `Add from other projects` opens a `Popover` with a search field (placeholder `Search people…`) and the list of people outside this team, each with avatar, name, `@handle` and level; choosing one adds them at once and closes the popover. The list is a `cmdk` `Command`, as the model fields.
- A write that fails shows, at the top of the tab, in the style of the Board's notices, `Trama could not save the team: <reason>.` with `Close`, and the tab shows the data as it is stored.
- People that cannot be read (`data#person`) are not listed; a line in secondary text under the header says `<n> saved people could not be read and are not shown.`

## manager-mode

- Settings tab, `Project` group, after the Solo Mode row: a `Checkbox` titled `Manager Mode` with the description «Plan work for your team and publish it as GitHub issues. Only for this working copy.». Under it a line in secondary text: `Repository: <owner>/<repo> · origin on GitHub`, with `owner/repo` in the monospace font.
- Without origin on GitHub the `Checkbox` is disabled and unchecked (also when Manager mode is recorded), and under the description, with lucide `Info`, the line `Needs a repository on GitHub (the origin remote).`; the repository line says `No origin remote` or `Origin is not on GitHub`.
- Setup wizard, `Project` step, in every mode: the same row, last in the step, inside a bordered box; above it, in the same step, a bordered box with `Repository` on the left and on the right `<owner>/<repo> · origin on GitHub`, `No origin remote` or `Origin is not on GitHub`. In the first setup the repository is the one of the folder chosen in the `Path` step.
- Summary of the wizard: in the `Project` step, the line `Manager Mode: On` or `Manager Mode: Off`, highlighted with the current value when it changes it, like the settings.
- A write of Manager mode that fails from the Settings tab shows the editor's error message `Trama: could not save Manager Mode: <reason>.` and the row goes back to the recorded value.
- These texts are in English and do not follow `trama.language`.
