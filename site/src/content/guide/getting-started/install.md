---
title: "Install the extension"
description: "Install Trama from the VS Code Marketplace or from a .vsix file."
order: 2
---

## From a .vsix file

Each release has one `.vsix` per platform (`linux-x64`, `darwin-arm64` and `win32-x64`).

1. Download the file for your platform from [Releases](https://github.com/nicchia-code/trama/releases).
2. In VS Code, run **Extensions: Install from VSIX…** from the command palette, and choose the file. Or, from a terminal:

```sh
code --install-extension trama-<platform>-<version>.vsix
```

## Install and open Trama

```step
title: Install Trama and open its menu
text: |
  Open the [Trama page on the VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=trama-dev.trama) and press **Install**, or search for **Trama** in the Extensions view. Then click the Trama icon, the woven bars of the logo, in the activity bar: the side menu opens.
scene: menu-get-started
alt: "VS Code with the Trama icon selected in the activity bar and Trama's side menu open on a folder that is not a Trama project, offering Get Started at the top and Settings at the bottom."
eager: true
```

## After installing

- In a folder that already is a Trama project, the menu lists the views: Board, Diagram, Requirements, Specs and History.
- In any other folder, the menu offers **Get Started**, which puts Trama into the project. See [Put Trama in a project](/guide/getting-started/get-started/).
- With no folder open, the menu offers **Open Folder**.

Trama keeps the agent skills it installed in a project up to date: when it opens a project after an update, a short message says `Trama: updated the agent skills to this version.`

Before the first agent job, set up omp: [First run of omp](/guide/getting-started/first-run/).
