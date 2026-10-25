# Person

A person the Manager leads, as Trama knows them in the Manager's editor: name, GitHub handle, level of experience (junior, mid or senior), skills, how many days of work fit in one sprint and the days the person is absent. The agent uses them to propose who does a piece of work, who reviews it and in which sprint, and to adapt how much detail the work carries to the level of whoever does it. Trama never sends any of this anywhere: only the GitHub handle ever appears on GitHub, where it already is.

A person is born when the Manager adds them from the People tab of the Team view of a project (see the Panel): they start in the team of that project. Two people never share a GitHub handle. The same person can be in the team of several projects; the list of people is one for all the projects of the Manager's editor.

## States

### In this team (initial)
The person is in the team of this project: the People tab lists them and the agent may propose them for the work of this project.
- `developer.EDIT_PERSON` → In this team: the Manager changes and saves the person's data; the change holds in every project the person is in. A value that is not valid is refused under its field and nothing is saved.
- `developer.REMOVE_FROM_TEAM` → Outside this team: the person leaves the team of this project and stays in the Manager's list and in the teams of the other projects. Work already given to them on GitHub stays theirs.
- `developer.DELETE_PERSON` → Deleted: after the Manager confirms. The person leaves the Manager's list and the team of every project.

### Outside this team
The person is in the Manager's list but not in the team of this project: the People tab offers them among the people to add from other projects.
- `developer.ADD_TO_TEAM` → In this team: the Manager adds the person to the team of this project, with the data they already have.
- `developer.DELETE_PERSON` → Deleted: after the Manager confirms, as above.

### Deleted (final)
The person is no longer known to Trama.
