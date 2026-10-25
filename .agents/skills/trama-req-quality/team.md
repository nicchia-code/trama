# Requirements: Qualità, Team

Use when the work touches the privacy of the people of the Manager's team or the accessibility of the Team view.

## person

- Privacy: what Trama knows about people (name, level, skills, capacity, absences, the projects they are in) never leaves the Manager's editor through Trama. It is never written in the project, in `.trama/`, in logs, in the output channel, in away notifications, in History entries, in Proposals, Tasks or Drifts, and never sent to a model by Trama. Only the GitHub handle may appear in texts meant for GitHub.
- `trama team show` answers only an agent launched by the same editor window, through the window's secret (`tech#question-round`), and only with the members of that project's team.
- The level of a person is the Manager's private note: the Team view never shows it outside the People tab and the person dialog.
- Accessibility of the Team view: contrast AA in the light and dark themes, every control reachable and usable from the keyboard with a visible focus ring, the person dialog keeps the focus inside while open and gives it back to the button that opened it, every validation message is linked to its field.
