---
title: "Requirements"
description: "What Trama needs: VS Code, a supported platform, omp, and the GitHub CLI only for Team."
order: 1
---

Trama is a VS Code extension that works with a coding agent. Before installing it, check that the machine has what follows.

## What you need

- **VS Code 1.106 or later.** It is the only editor Trama supports.
- **A supported platform.** Linux (x64), macOS (Apple silicon) or Windows (x64). Windows is in preview: `trama.exe` is not signed, so SmartScreen or an antivirus may warn the first time it runs.
- **omp**, the only agent Trama supports. Trama runs every agent job with omp. If omp is missing, Trama offers to install it with omp's official installer; see [First run of omp](/guide/getting-started/first-run/).
- **An account with a model provider**, logged in through omp, so the agent has a model to work with.
- **The GitHub CLI (`gh`), only for Team.** Team, which needs Manager mode (experimental), reads your GitHub Project and the issues published on it through `gh`, which has to be installed and logged in with access to Projects; see [Manager mode and Team](/guide/workflows/manager-mode/). Everything else works without it.
- **git, only for Solo mode.** [Solo mode](/guide/workflows/solo-mode/) keeps Trama's files out of git, so the folder has to be a git repository.

## What Trama does with your code

Trama never calls a language model and never reads your code: the agent does, through Trama's command line. Trama sends nothing off the machine, apart from the notification you can turn on to be told, away from the computer, that the agent finished or waits for you (see [Away notifications](/guide/panel-and-settings/notifications/)), and the read-only requests that Team makes through `gh`.

## Check that omp is ready

Once Trama is installed (see [Install the extension](/guide/getting-started/install/)), one look at Settings tells whether the machine has omp and a provider.

```step
title: Check that omp answers
text: |
  Open **Settings** from the side menu. The box at the top of the **omp** group reads `omp <version> answered with <N> models.` when omp is found and working, and **Providers** lists the model providers you are connected to.
scene: settings-omp
alt: "The Settings page of Trama in VS Code. At the top, a box says omp answered with 3 models, and under Providers ChatGPT and Anthropic are Connected while the other providers offer a Log in button."
eager: true
```

## Next

[Install the extension](/guide/getting-started/install/).
