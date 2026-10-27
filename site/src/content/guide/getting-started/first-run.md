---
title: "First run of omp"
description: "Install omp, log in to a model provider and choose the models Trama uses."
order: 3
---

Trama runs every agent job with [omp](https://omp.sh). The first time, three things have to be in place: omp itself, a login to a model provider, and, optionally, the models for each kind of work. All three are in the **omp** and **Models** groups of Settings, and in the same steps of the setup wizard (see [Put Trama in a project](/guide/getting-started/get-started/)).

```step
title: Install omp
text: |
  When omp is not installed, Settings says so, and any agent job shows `Trama: omp is not installed. Trama runs every agent with omp.` Press **Install omp**: a terminal opens and installs omp with its official installer.
scene: omp-missing
alt: "The Settings page of Trama when omp is not found: a warning box says omp was not found at the configured path and has an Install omp button, with the Omp Path field below it."
eager: true
```

Where omp is not on the editor's `PATH`, set its location with **Omp Path**; left empty, Trama looks for `omp` on the `PATH`, then in `~/.bun/bin` and `~/.local/bin`. Trama updates omp before it launches it, with a short notification `Updating omp to <version>…`; if the update fails, the agent runs with the version already installed.

```step
title: Log in to a provider
text: |
  The box at the top of the **omp** group says `omp <version> answered with <N> models.` Under **Providers**, press **Log in** beside your provider: a terminal opens and logs omp in, and the provider then shows **Connected**.
scene: settings-omp
alt: "The omp group of Settings: a box saying omp answered with 3 models, and the Providers list where ChatGPT and Anthropic are Connected and GitHub Copilot, Google Gemini CLI and others have a Log in button."
```

A connected provider shows **Log in again** and **Log out**. A provider that is still connected through an environment variable or `models.yml` has to be disconnected there.

```step
title: Choose the models
text: |
  The **Models** group has one field for each kind of work: **Analysis** for design and import, **Scan** for scans and **Execution** for implementing Tasks. Leave a field empty to keep omp's default model, or pick one from the list.
scene: settings-models
alt: "The Models group of Settings with three empty model fields, Analysis described as your most capable model, Scan as a fast, light model and Execution as a mid-range model, followed by Max Parallel Agents set to 20."
```

| Setting | Used for | Advice |
| --- | --- | --- |
| Analysis | Design requests, Resolve Drifts, import | Your most capable model |
| Execution | Implementing Tasks, in a single Run and in Run all | A mid-range model |
| Scan | Scans and the sub-agents that compare Machines | A fast, light model |

Where omp declares thinking levels for the model, a small selector beside the field chooses one. All settings are described in [Settings](/guide/panel-and-settings/settings/).

```step
title: Decide whether omp asks first
text: |
  By default Trama's jobs open as conversations in **omp Chat**, and omp runs every command without asking (**omp Chat Approval** is `yolo`). To have omp ask permission, as it does in the terminal, choose `ask`.
scene: settings-omp-chat
alt: "The omp Chat and Notifications groups of Settings: the omp Chat checkbox, the omp Chat Approval selector set to yolo, omp Chat Intent Tracing, and the ntfy Server and ntfy Topic fields with Set access token and Send test notification."
```

## The language of the agent

**Language** makes the agent write Tasks, Drifts, Proposals, questions and replies in another language, for example `Italian`. The Model, the Requirements, the Specs and the code stay in English. Empty keeps English.

## Instruction files

If the project has agent instruction files (`AGENTS.md`, `CLAUDE.md`, `.omp/RULES.md`), the omp box lists them: the agent loads them in every Trama job, so they may conflict with Trama. Remove them from the repository, or turn on **Ignore Instruction Files** to make Trama's jobs skip them.
