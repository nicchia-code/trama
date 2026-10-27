---
title: "Settings"
description: "Every setting of the extension, with what it does and its default."
order: 5
generated: settings
---

Open **Settings** from the side menu, or from **Open Settings** in the message that says omp is missing. The page is one column of groups, from the top:

- **omp**: the status of omp, the model providers, and the settings of how agents run.
- **Models**: the model for each kind of work.
- **Project**: where skills are installed, and **Solo Mode** and **Manager Mode** (experimental), which are switches of the working copy rather than settings.
- **Advanced**: the theme, the options of Drifts, agents and omp Chat, and notifications.

Next to the title, **Guided setup** goes through the main settings step by step, as the first setup does. Each setting shows a title, an explanation, its control, and, where it applies, a message: `The workspace setting overrides this: <value>` when the project's own settings differ from yours, or the reason a value is not valid. A change takes effect at once.

```screenshot
scene: settings-project
alt: "The Project group of Settings with the Skills Dir field, the Solo Mode and Manager Mode checkboxes and, below, the Advanced group starting with Theme and the Drifts options."
```

```screenshot
scene: settings-drifts
alt: "The Drifts and Agents groups of Settings with Advisor Scanner, Async Drift Resolver, Parallel Execution, Sub-agents Context Sharing and Auto-update Stale Proposals checked, and the omp Chat Approval selector set to yolo."
```

**Solo Mode** keeps Trama's files out of git in this working copy: see [Solo mode and Merge](/guide/workflows/solo-mode/). **Manager Mode**, experimental, turns on Team: see [Manager mode and Team](/guide/workflows/manager-mode/).

The list below is generated from the extension's manifest when the site is built, so it always matches the editor's own settings page. Each setting is also in VS Code's Settings UI, under **Trama**, and in `settings.json` under the key shown.
