---
status: resolved
resolution: unified
refs:
  - requirements/tech#panel/Settings
proposal: null
task: null
origin: null
unifiedInto: kyaecq54
option: null
note: null
created: 2026-10-23T11:17:09.244Z
job: db0e3e5e-a2ec-49ff-ab30-261d5f732015
---
# Extension README missing

## What happens

The extension folder has no README, so the editor's Extensions view shows no extension description, although the Model says the extension README names the Settings tab's groups and says that changes are saved to the user settings.

## What should happen

The extension has its own short README that names the Settings tab, its groups Agent, Models, Project and Features, and the rule that changes are saved to the user settings.

## Fix options

### Restore the extension README

Write extension/README.md again as a short introduction to Trama, written for the editor's Extensions view. It says that the Settings tab of the panel changes settings, always saving to the user settings, and names its groups: Agent, Models, Project and Features. It links to the main README for the rest. This is the smallest change that matches the Model as written.

### Describe the extension in the manifest

Keep the extension folder without a README and give the Extensions view its description from the package manifest instead: a short description that says what Trama is and that its settings are changed in the Settings tab. This matches the Model only in part, since the group names then live only in the main README. It costs no extra file, but the Extensions view shows no groups.

## Where in the code

extension/ (no README.md in the folder; the manifest is extension/package.json)
