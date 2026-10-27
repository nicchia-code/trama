---
title: "Put Trama in a project"
description: "The Get Started wizard, step by step, with its two paths: Import from Code and Start from Scratch."
order: 4
---

In a folder that is not yet a Trama project, **Get Started** opens a wizard that sets Trama up. The steps below follow the path of a project that already has code, **Import from Code**; where **Start from Scratch** differs, the step says so, and [Start from Scratch](/guide/workflows/start-from-scratch/) tells that path in full.

```step
title: Open Get Started
text: |
  Open the folder in VS Code, click the Trama icon in the activity bar and choose **Get Started**. The setup wizard opens in the panel.
scene: menu-get-started
alt: "Trama's side menu on a folder that is not yet a Trama project, with Get Started at the top, Settings at the bottom and the Trama icon selected in the activity bar."
eager: true
```

```step
title: Choose a path
text: |
  Choose **Import from Code** for a project that already has its code, or **Start from Scratch** for an application still to be built, then press **Next**. A notice says Trama will create a `.trama` folder, which holds no secrets and is meant to be committed.
scene: wizard-path
alt: "The Path step of the Set up Trama wizard with its six steps listed at the top, a notice about the .trama folder, and the two cards Import from Code and Start from Scratch, none chosen yet, with Next disabled."
```

```step
title: Check omp
text: |
  The **omp** step checks that omp answers and lists the providers: press **Log in** for a provider that is not connected (see [First run of omp](/guide/getting-started/first-run/)), then **Next**.
scene: wizard-omp
alt: "The omp step of the Set up Trama wizard: a box saying omp answered with 3 models and the Providers list with ChatGPT and Anthropic connected and Log in buttons for the others, with Back and Next at the bottom."
```

```step
title: Choose the models
text: |
  In **Models**, pick the model for **Analysis**, **Scan** and **Execution**, or leave the fields empty to keep omp's default. Press **Next**.
scene: wizard-models
alt: "The Models step of the wizard with the empty fields for Analysis, Scan and Execution and the Max Parallel Agents field set to 20, with Back and Next at the bottom."
```

```step
title: Set up the project
text: |
  **Skills Dir** is the folder where Trama installs the agent skills. **Solo Mode** and **Manager Mode** (experimental) are optional switches, described in [Solo mode and Merge](/guide/workflows/solo-mode/) and [Manager mode and Team](/guide/workflows/manager-mode/).
scene: wizard-project
alt: "The Project step of the wizard with the Skills Dir field set to .agents/skills, the Solo Mode checkbox, a Repository line saying no origin remote, and the Manager Mode checkbox."
```

```step
title: Choose the folders to import
text: |
  Only **Import from Code** has this step. Uncheck the folders the agent should not read, such as vendored code or build output.
scene: wizard-folders
alt: "The Folders step of the wizard listing the folders of the project, src and README.md, each with a checked box, under the line Everything is included."
```

```step
title: Look at the advanced options
text: |
  **Advanced** has the theme and the options of Drifts and agents. All of them have a good default, so press **Skip** or **Next**.
scene: wizard-advanced
alt: "The Advanced step of the wizard with the Theme selector, the Advisor Scanner and Async Drift Resolver checkboxes under Drifts, and Parallel Execution under Agents, with Back, Skip and Next at the bottom."
```

```step
title: Confirm
text: |
  The **Summary** shows a card for each step, with an **Edit** button to go back; a row that changes a current setting is marked `changed`. Press **Set up Trama** to confirm.
scene: wizard-summary
alt: "The Summary step of the wizard: the notice about the .trama folder, then cards for Path (Import from Code), omp and Models, each with an Edit button, and the Set up Trama button at the bottom right."
```

```step
title: See the import start
text: |
  After **Set up Trama**, the agent starts reading the code: an **Import** conversation opens in omp Chat and the status bar shows `Importing from code`. The result arrives as Proposals (see [Import from code](/guide/workflows/import/)).
scene: import-started
alt: "The Board of a project just set up, empty, with an Import conversation open in omp Chat on the right and the status bar showing Importing from code at the bottom left."
```

```step
title: Describe the application (Start from Scratch)
text: |
  After **Set up Trama** with **Start from Scratch**, a written request opens instead. Describe the application, then press **Send to agent**: [Start from Scratch](/guide/workflows/start-from-scratch/) goes on from here.
scene: scratch-request
alt: "A new Markdown request open in the editor after setting up with Start from Scratch, with a grey hint on the first line asking to describe the application to build, and the Send to agent button in the title bar."
```

If the project already has skill files with different content, a dialog says `Trama did not initialize this project.`, lists the files in conflict and offers **Overwrite and Initialize**. With Solo mode on, the notice says instead that Trama's files are kept out of git in this working copy only.

## Later

The same wizard is available again as **Guided setup** at the top of Settings, to review the main settings step by step. In a project whose Model is still empty, the Diagram shows `The Model is empty. Import the existing code or start from scratch; later, design changes from the Board.` with the two buttons **Import from Code** and **Start from Scratch**.
